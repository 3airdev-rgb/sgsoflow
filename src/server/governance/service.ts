import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { recordAuditEvent } from "@/server/audit/service";
import { requireAirportAccess, type AuthorizationContext } from "@/server/authorization/policies";
import { ConflictError, NotFoundError } from "@/server/errors";
import { assertNotLocalPreviewMutation, type LocalPreviewAwareActor } from "@/server/local-preview";
import { calculateAnacNotificationDueDate, evaluateAccumulation, evaluateDesignationNotificationApplicability, evaluateMultiAirportAccumulation, evaluateRegulatoryAuthority, evaluateSafetyCommitteeApplicability, evaluateSafetyCommitteeComposition, evaluateStaffingCoverage, hasExclusiveConflict, periodsOverlap, resolveNotificationStatus, type AuthorityEvaluation, type RegulatoryProfileContext } from "@/server/governance/domain";

type Scope = { actor: LocalPreviewAwareActor; authz: AuthorizationContext; organizationId: string; airportId: string; userId: string };
type DesignationInput = {
  holderUserId: string; regulatoryRoleId: string; designationDate: Date; effectiveFrom: Date; effectiveTo?: Date | null;
  designationReference?: string | null; additionalPrerogatives?: string | null; responsibilityLimits?: string | null;
  reportsToDesignationId?: string | null; notes?: string | null;
};

const profileSelect = { operationalClass: true, operatesRegularRBAC121: true, operatesRegularRBAC135: true } as const;
async function getProfileContext(client: Pick<typeof db, "regulatoryProfile">, airportId: string): Promise<RegulatoryProfileContext> {
  return await client.regulatoryProfile.findFirst({ where: { airportId, status: "ACTIVE" }, select: profileSelect, orderBy: { effectiveFrom: "desc" } }) ?? { operationalClass: null, operatesRegularRBAC121: null, operatesRegularRBAC135: null };
}

async function requireManagedAirport(scope: Omit<Scope, "actor">, permission: "governance:read" | "governance:manage") {
  requireAirportAccess(scope.authz, scope.organizationId, scope.airportId, permission);
  const airport = await db.airport.findFirst({ where: { id: scope.airportId, organizationId: scope.organizationId, status: "ACTIVE", deletedAt: null } });
  if (!airport) throw new NotFoundError("Aeródromo não encontrado.");
  return airport;
}

async function requireEligibleHolder(organizationId: string, airportId: string, userId: string) {
  const membership = await db.membership.findFirst({
    where: { userId, organizationId, status: "ACTIVE", deletedAt: null, user: { status: "ACTIVE", deletedAt: null }, airportAccesses: { some: { airportId, status: "ACTIVE", deletedAt: null } } },
  });
  if (!membership) throw new ConflictError("A pessoa deve possuir Membership ativo e acesso ao aeródromo no mesmo tenant.");
}

export async function getGovernanceWorkspace(scope: Omit<Scope, "actor" | "userId">) {
  await requireManagedAirport({ ...scope, userId: scope.authz.userId }, "governance:read");
  const [roles, authorities, designations, committees, memberships, profile, assessment] = await Promise.all([
    db.regulatoryRole.findMany({ where: { status: "ACTIVE" }, include: { responsibilities: { where: { status: "ACTIVE" } }, authorities: { where: { status: "ACTIVE" }, include: { regulatoryAuthority: true } } }, orderBy: { code: "asc" } }),
    db.regulatoryAuthority.findMany({ where: { status: "ACTIVE" }, orderBy: { code: "asc" } }),
    db.regulatoryDesignation.findMany({ where: { airportId: scope.airportId }, include: { holder: { select: { id: true, name: true, email: true } }, regulatoryRole: true }, orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }] }),
    db.safetyCommittee.findMany({ where: { airportId: scope.airportId }, include: { members: { include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { effectiveFrom: "desc" } } }, orderBy: { effectiveFrom: "desc" } }),
    db.membership.findMany({ where: { organizationId: scope.organizationId, status: "ACTIVE", deletedAt: null, user: { status: "ACTIVE", deletedAt: null }, airportAccesses: { some: { airportId: scope.airportId, status: "ACTIVE", deletedAt: null } } }, include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { user: { name: "asc" } } }),
    db.regulatoryProfile.findFirst({ where: { airportId: scope.airportId, status: "ACTIVE" }, select: profileSelect, orderBy: { effectiveFrom: "desc" } }),
    db.applicabilityAssessment.findFirst({ where: { airportId: scope.airportId }, select: { managementRegime: true }, orderBy: { evaluatedAt: "desc" } }),
  ]);
  const profileContext = profile ?? { operationalClass: null, operatesRegularRBAC121: null, operatesRegularRBAC135: null };
  const at = new Date();
  const staffing = evaluateStaffingCoverage({ profile: profileContext, activeDesignations: designations.filter((item) => item.status === "ACTIVE" && item.effectiveFrom <= at && (!item.effectiveTo || item.effectiveTo >= at)).map((item) => ({ userId: item.userId, regulatoryRoleCode: item.regulatoryRole.code })) });
  const csoApplicability = evaluateSafetyCommitteeApplicability(assessment?.managementRegime ?? null);
  return {
    roles, authorities,
    designations: designations.map((item) => ({ ...item, effectiveNotificationStatus: resolveNotificationStatus({ status: item.notificationStatus, dueDate: item.notificationDueDate, notifiedAt: item.notifiedAt, at }) })),
    committees: committees.map((committee) => ({ ...committee, composition: evaluateSafetyCommitteeComposition({ applicability: csoApplicability.decision, profile: profileContext, at, designations: designations.map((item) => ({ userId: item.userId, regulatoryRoleCode: item.regulatoryRole.code, status: item.status, effectiveFrom: item.effectiveFrom, effectiveTo: item.effectiveTo })), members: committee.members.map((member) => ({ userId: member.userId, status: member.status, memberType: member.memberType, effectiveFrom: member.effectiveFrom, effectiveTo: member.effectiveTo })) }) })),
    people: memberships.map((item) => item.user), profile: profileContext, staffing, csoApplicability,
  };
}

export async function createRegulatoryDesignation(scope: Scope, input: DesignationInput) {
  assertNotLocalPreviewMutation(scope.actor);
  await requireManagedAirport(scope, "governance:manage");
  await requireEligibleHolder(scope.organizationId, scope.airportId, input.holderUserId);
  const role = await db.regulatoryRole.findFirst({ where: { id: input.regulatoryRoleId, status: "ACTIVE" } });
  if (!role) throw new NotFoundError("Função regulamentar não encontrada.");
  if (input.effectiveTo && input.effectiveTo < input.effectiveFrom) throw new ConflictError("Período de vigência inválido.");
  const activeRoles = await db.regulatoryDesignation.findMany({
    where: { airportId: scope.airportId, userId: input.holderUserId, status: "ACTIVE" },
    include: { regulatoryRole: { select: { code: true } } },
  });
  const overlappingRoles = activeRoles.filter((item) => periodsOverlap(item, { effectiveFrom: input.effectiveFrom, effectiveTo: input.effectiveTo ?? null }));
  const profile = await getProfileContext(db, scope.airportId);
  const accumulation = evaluateAccumulation({ profile, candidateRoleCode: role.code, existingActiveRoleCodes: overlappingRoles.map((item) => item.regulatoryRole.code) });
  if (accumulation.decision === "REQUIRES_REVIEW" || accumulation.decision === "PROHIBITED") throw new ConflictError(`${accumulation.decision}: ${accumulation.rationale}`);
  if (input.reportsToDesignationId) {
    const supervisor = await db.regulatoryDesignation.findFirst({ where: { id: input.reportsToDesignationId, airportId: scope.airportId } });
    if (!supervisor) throw new ConflictError("A designação superior deve pertencer ao mesmo aeródromo e tenant.");
  }
  const notificationApplicability = evaluateDesignationNotificationApplicability(profile, role.code);
  if (notificationApplicability.decision === "REQUIRES_REVIEW") throw new ConflictError("REQUIRES_REVIEW: o perfil não permite determinar a obrigação de comunicação da designação à ANAC.");
  const notificationApplicable = notificationApplicability.decision === "APPLICABLE";
  const notificationDueDate = notificationApplicable ? calculateAnacNotificationDueDate(input.designationDate) : null;
  return db.$transaction(async (tx) => {
    const designation = await tx.regulatoryDesignation.create({ data: {
      airportId: scope.airportId, userId: input.holderUserId, regulatoryRoleId: role.id,
      designationDate: input.designationDate, effectiveFrom: input.effectiveFrom, effectiveTo: input.effectiveTo ?? null, status: "DRAFT",
      designationReference: input.designationReference ?? null, additionalPrerogatives: input.additionalPrerogatives ?? null,
      responsibilityLimits: input.responsibilityLimits ?? null, reportsToDesignationId: input.reportsToDesignationId ?? null,
      notificationDueDate, notificationStatus: notificationApplicable ? "PENDING" : "NOT_APPLICABLE",
      notes: input.notes ?? null, createdBy: scope.userId,
    } });
    await recordAuditEvent(tx, { userId: scope.userId, organizationId: scope.organizationId, airportId: scope.airportId, action: "REGULATORY_DESIGNATION_CREATED", entityType: "RegulatoryDesignation", entityId: designation.id, newValue: designation as unknown as Prisma.InputJsonValue, metadata: { roleCode: role.code, accumulationDecision: accumulation.decision, accumulationSource: accumulation.sourceReference } });
    return designation;
  });
}

export async function activateRegulatoryDesignation(scope: Scope, designationId: string) {
  assertNotLocalPreviewMutation(scope.actor);
  await requireManagedAirport(scope, "governance:manage");
  return db.$transaction(async (tx) => {
    const candidate = await tx.regulatoryDesignation.findFirst({ where: { id: designationId, airportId: scope.airportId }, include: { regulatoryRole: true } });
    if (!candidate) throw new NotFoundError("Designação não encontrada.");
    if (candidate.status !== "DRAFT") throw new ConflictError("Somente designações em rascunho podem ser ativadas.");
    const accumulatedRoles = await tx.regulatoryDesignation.findMany({ where: { airportId: scope.airportId, userId: candidate.userId, status: "ACTIVE" }, include: { regulatoryRole: { select: { code: true } } } });
    const overlappingRoles = accumulatedRoles.filter((item) => periodsOverlap(item, candidate));
    const profile = await getProfileContext(tx, scope.airportId);
    const accumulation = evaluateAccumulation({ profile, candidateRoleCode: candidate.regulatoryRole.code, existingActiveRoleCodes: overlappingRoles.map((item) => item.regulatoryRole.code) });
    if (accumulation.decision === "REQUIRES_REVIEW" || accumulation.decision === "PROHIBITED") throw new ConflictError(`${accumulation.decision}: ${accumulation.rationale}`);
    const existing = await tx.regulatoryDesignation.findMany({ where: { airportId: scope.airportId, regulatoryRoleId: candidate.regulatoryRoleId, status: "ACTIVE" } });
    if (hasExclusiveConflict({ multiplicity: candidate.regulatoryRole.holderMultiplicity, candidate, existing })) {
      const conflicting = existing.filter((item) => periodsOverlap(item, candidate));
      const supersedable = conflicting.filter((item) => item.effectiveFrom < candidate.effectiveFrom);
      if (supersedable.length !== conflicting.length) throw new ConflictError("Existe designação exclusiva ativa conflitante neste período.");
      const dayBefore = new Date(candidate.effectiveFrom); dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);
      for (const prior of supersedable) {
        const updated = await tx.regulatoryDesignation.update({ where: { id: prior.id }, data: { status: "SUPERSEDED", effectiveTo: dayBefore } });
        await recordAuditEvent(tx, { userId: scope.userId, organizationId: scope.organizationId, airportId: scope.airportId, action: "REGULATORY_DESIGNATION_SUPERSEDED", entityType: "RegulatoryDesignation", entityId: prior.id, previousValue: prior as unknown as Prisma.InputJsonValue, newValue: updated as unknown as Prisma.InputJsonValue, metadata: { supersededBy: candidate.id } });
      }
    }
    const activated = await tx.regulatoryDesignation.update({ where: { id: candidate.id }, data: { status: "ACTIVE" } });
    await recordAuditEvent(tx, { userId: scope.userId, organizationId: scope.organizationId, airportId: scope.airportId, action: "REGULATORY_DESIGNATION_ACTIVATED", entityType: "RegulatoryDesignation", entityId: candidate.id, previousValue: candidate as unknown as Prisma.InputJsonValue, newValue: activated as unknown as Prisma.InputJsonValue, metadata: { roleCode: candidate.regulatoryRole.code } });
    return activated;
  });
}

export async function revokeRegulatoryDesignation(scope: Scope, designationId: string, effectiveTo: Date) {
  assertNotLocalPreviewMutation(scope.actor);
  await requireManagedAirport(scope, "governance:manage");
  return db.$transaction(async (tx) => {
    const current = await tx.regulatoryDesignation.findFirst({ where: { id: designationId, airportId: scope.airportId } });
    if (!current) throw new NotFoundError("Designação não encontrada.");
    if (!(["DRAFT", "ACTIVE"] as string[]).includes(current.status)) throw new ConflictError("Designação histórica não pode ser alterada.");
    if (effectiveTo < current.effectiveFrom) throw new ConflictError("A revogação não pode anteceder o início da vigência.");
    const revoked = await tx.regulatoryDesignation.update({ where: { id: current.id }, data: { status: "REVOKED", effectiveTo } });
    await recordAuditEvent(tx, { userId: scope.userId, organizationId: scope.organizationId, airportId: scope.airportId, action: "REGULATORY_DESIGNATION_REVOKED", entityType: "RegulatoryDesignation", entityId: current.id, previousValue: current as unknown as Prisma.InputJsonValue, newValue: revoked as unknown as Prisma.InputJsonValue });
    return revoked;
  });
}

export async function recordAnacDesignationNotification(scope: Scope, designationId: string, input: { notifiedAt: Date; evidence: string }) {
  assertNotLocalPreviewMutation(scope.actor);
  await requireManagedAirport(scope, "governance:manage");
  if (!input.evidence.trim()) throw new ConflictError("Informe a evidência do envio à ANAC.");
  return db.$transaction(async (tx) => {
    const current = await tx.regulatoryDesignation.findFirst({ where: { id: designationId, airportId: scope.airportId } });
    if (!current) throw new NotFoundError("Designação não encontrada.");
    if (current.notificationStatus === "NOT_APPLICABLE") throw new ConflictError("Esta designação não exige notificação à ANAC.");
    if (current.notificationStatus === "SUBMITTED") throw new ConflictError("A notificação já foi registrada.");
    const updated = await tx.regulatoryDesignation.update({ where: { id: current.id }, data: { notificationStatus: "SUBMITTED", notifiedAt: input.notifiedAt, notificationEvidence: input.evidence.trim() } });
    await recordAuditEvent(tx, { userId: scope.userId, organizationId: scope.organizationId, airportId: scope.airportId, action: "REGULATORY_DESIGNATION_ANAC_NOTIFICATION_RECORDED", entityType: "RegulatoryDesignation", entityId: current.id, previousValue: current as unknown as Prisma.InputJsonValue, newValue: updated as unknown as Prisma.InputJsonValue, metadata: { evidence: input.evidence.trim() } });
    return updated;
  });
}

export async function evaluateHolderMultiAirportAccumulation(scope: Omit<Scope, "actor">, holderUserId: string) {
  await requireManagedAirport(scope, "governance:read");
  const designations = await db.regulatoryDesignation.findMany({
    where: { userId: holderUserId, status: "ACTIVE", airport: { organizationId: scope.organizationId, deletedAt: null } },
    select: { airportId: true, airport: { select: { name: true } } }, distinct: ["airportId"],
  });
  return Promise.all(designations.map(async (item) => ({ airportId: item.airportId, airportName: item.airport.name, ...evaluateMultiAirportAccumulation(await getProfileContext(db, item.airportId)) })));
}

export async function canPerformRegulatoryAction(input: { authz: AuthorizationContext; organizationId: string; airportId: string; userId: string; authorityCode: string; at?: Date }): Promise<AuthorityEvaluation> {
  await requireManagedAirport({ ...input, userId: input.authz.userId }, "governance:read");
  const at = input.at ?? new Date();
  const designations = await db.regulatoryDesignation.findMany({
    where: { airportId: input.airportId, userId: input.userId },
    include: { regulatoryRole: { include: { authorities: { include: { regulatoryAuthority: true } } } } },
  });
  return evaluateRegulatoryAuthority({ userId: input.userId, airportId: input.airportId, authorityCode: input.authorityCode, at, designations: designations.map((designation) => ({
    id: designation.id, userId: designation.userId, airportId: designation.airportId, status: designation.status,
    effectiveFrom: designation.effectiveFrom, effectiveTo: designation.effectiveTo,
    regulatoryRole: { code: designation.regulatoryRole.code, status: designation.regulatoryRole.status },
    authorities: designation.regulatoryRole.authorities.map((mapping) => ({ code: mapping.regulatoryAuthority.code, status: mapping.status === "ACTIVE" && mapping.regulatoryAuthority.status === "ACTIVE" ? "ACTIVE" as const : "INACTIVE" as const, effectiveFrom: mapping.effectiveFrom, effectiveTo: mapping.effectiveTo })),
  })) });
}

async function currentCommitteeApplicability(airportId: string) {
  const assessment = await db.applicabilityAssessment.findFirst({ where: { airportId }, select: { managementRegime: true }, orderBy: { evaluatedAt: "desc" } });
  return evaluateSafetyCommitteeApplicability(assessment?.managementRegime ?? null);
}

export async function createSafetyCommittee(scope: Scope, input: { name: string; effectiveFrom: Date; effectiveTo?: Date | null }) {
  assertNotLocalPreviewMutation(scope.actor);
  await requireManagedAirport(scope, "governance:manage");
  if (input.effectiveTo && input.effectiveTo < input.effectiveFrom) throw new ConflictError("Período de vigência inválido.");
  const applicability = await currentCommitteeApplicability(scope.airportId);
  return db.$transaction(async (tx) => {
    const committee = await tx.safetyCommittee.create({ data: { airportId: scope.airportId, name: input.name, applicability: applicability.decision, effectiveFrom: input.effectiveFrom, effectiveTo: input.effectiveTo ?? null, createdBy: scope.userId } });
    await recordAuditEvent(tx, { userId: scope.userId, organizationId: scope.organizationId, airportId: scope.airportId, action: "SAFETY_COMMITTEE_CREATED", entityType: "SafetyCommittee", entityId: committee.id, newValue: committee as unknown as Prisma.InputJsonValue });
    return committee;
  });
}

export async function updateSafetyCommittee(scope: Scope, committeeId: string, input: { name?: string; status?: "ACTIVE" | "INACTIVE" | "SUSPENDED"; effectiveTo?: Date | null }) {
  assertNotLocalPreviewMutation(scope.actor);
  await requireManagedAirport(scope, "governance:manage");
  return db.$transaction(async (tx) => {
    const current = await tx.safetyCommittee.findFirst({ where: { id: committeeId, airportId: scope.airportId } });
    if (!current) throw new NotFoundError("CSO não encontrada.");
    if (input.effectiveTo && input.effectiveTo < current.effectiveFrom) throw new ConflictError("A vigência final não pode anteceder o início.");
    const applicability = await currentCommitteeApplicability(scope.airportId);
    const committee = await tx.safetyCommittee.update({ where: { id: current.id }, data: { ...input, applicability: applicability.decision } });
    await recordAuditEvent(tx, { userId: scope.userId, organizationId: scope.organizationId, airportId: scope.airportId, action: "SAFETY_COMMITTEE_UPDATED", entityType: "SafetyCommittee", entityId: current.id, previousValue: current as unknown as Prisma.InputJsonValue, newValue: committee as unknown as Prisma.InputJsonValue });
    return committee;
  });
}

export async function addSafetyCommitteeMember(scope: Scope, committeeId: string, input: { memberUserId: string; roleInCommittee: string; memberType: "REQUIRED_MEMBER" | "ADDITIONAL_MEMBER"; effectiveFrom: Date; effectiveTo?: Date | null }) {
  assertNotLocalPreviewMutation(scope.actor);
  await requireManagedAirport(scope, "governance:manage");
  if (input.effectiveTo && input.effectiveTo < input.effectiveFrom) throw new ConflictError("Período de vigência inválido.");
  await requireEligibleHolder(scope.organizationId, scope.airportId, input.memberUserId);
  return db.$transaction(async (tx) => {
    const committee = await tx.safetyCommittee.findFirst({ where: { id: committeeId, airportId: scope.airportId, status: "ACTIVE" } });
    if (!committee) throw new NotFoundError("CSO não encontrada.");
    if (input.memberType === "REQUIRED_MEMBER") {
      const designation = await tx.regulatoryDesignation.findFirst({ where: { airportId: scope.airportId, userId: input.memberUserId, status: "ACTIVE", effectiveFrom: { lte: input.effectiveFrom }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: input.effectiveFrom } }] } });
      if (!designation) throw new ConflictError("Membro obrigatório deve possuir designação regulamentar ativa e vigente no mesmo aeródromo.");
    }
    const member = await tx.safetyCommitteeMember.create({ data: { safetyCommitteeId: committee.id, airportId: scope.airportId, userId: input.memberUserId, roleInCommittee: input.roleInCommittee, memberType: input.memberType, effectiveFrom: input.effectiveFrom, effectiveTo: input.effectiveTo ?? null } });
    await recordAuditEvent(tx, { userId: scope.userId, organizationId: scope.organizationId, airportId: scope.airportId, action: "SAFETY_COMMITTEE_MEMBER_ADDED", entityType: "SafetyCommitteeMember", entityId: member.id, newValue: member as unknown as Prisma.InputJsonValue, metadata: { committeeId } });
    return member;
  });
}

export async function revokeSafetyCommitteeMember(scope: Scope, committeeId: string, memberId: string, effectiveTo: Date) {
  assertNotLocalPreviewMutation(scope.actor);
  await requireManagedAirport(scope, "governance:manage");
  return db.$transaction(async (tx) => {
    const current = await tx.safetyCommitteeMember.findFirst({ where: { id: memberId, safetyCommitteeId: committeeId, airportId: scope.airportId, status: "ACTIVE" } });
    if (!current) throw new NotFoundError("Membro da CSO não encontrado.");
    if (effectiveTo < current.effectiveFrom) throw new ConflictError("A revogação não pode anteceder o início da vigência.");
    const revoked = await tx.safetyCommitteeMember.update({ where: { id: current.id }, data: { status: "REVOKED", effectiveTo } });
    await recordAuditEvent(tx, { userId: scope.userId, organizationId: scope.organizationId, airportId: scope.airportId, action: "SAFETY_COMMITTEE_MEMBER_REMOVED", entityType: "SafetyCommitteeMember", entityId: current.id, previousValue: current as unknown as Prisma.InputJsonValue, newValue: revoked as unknown as Prisma.InputJsonValue, metadata: { committeeId } });
    return revoked;
  });
}
