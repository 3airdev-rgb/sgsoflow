import type { Prisma, SafetyObjectiveStatus, SafetyPolicyReviewResult } from "@prisma/client";
import { db } from "@/server/db";
import { recordAuditEvent } from "@/server/audit/service";
import { requireAirportAccess, type AuthorizationContext } from "@/server/authorization/policies";
import { ConflictError, ForbiddenError, NotFoundError } from "@/server/errors";
import { canPerformRegulatoryAction } from "@/server/governance/service";
import { assertNotLocalPreviewMutation, type LocalPreviewAwareActor } from "@/server/local-preview";
import { assertObjectiveTransition, assertPolicyTransition, assertReviewDoesNotRewriteVersion, calculateSupersededEffectiveTo, evaluateObjectiveCompleteness, evaluatePolicyCompleteness, type PolicyContent } from "./domain";

export type SafetyPolicyScope = { actor: LocalPreviewAwareActor; authz: AuthorizationContext; organizationId: string; airportId: string; userId: string };

async function requireAirport(scope: Omit<SafetyPolicyScope, "actor">, permission: "policy:read" | "policy:manage") {
  requireAirportAccess(scope.authz, scope.organizationId, scope.airportId, permission);
  const airport = await db.airport.findFirst({ where: { id: scope.airportId, organizationId: scope.organizationId, status: "ACTIVE", deletedAt: null } });
  if (!airport) throw new NotFoundError("Aeródromo não encontrado.");
  return airport;
}

async function requireEligibleOwner(scope: SafetyPolicyScope, ownerUserId: string) {
  const membership = await db.membership.findFirst({ where: { userId: ownerUserId, organizationId: scope.organizationId, status: "ACTIVE", deletedAt: null, user: { status: "ACTIVE", deletedAt: null }, airportAccesses: { some: { airportId: scope.airportId, status: "ACTIVE", deletedAt: null } } } });
  if (!membership) throw new ConflictError("O responsável deve possuir Membership ativo e acesso ao aeródromo no mesmo tenant.");
}

export async function getSafetyPolicyWorkspace(scope: Omit<SafetyPolicyScope, "actor" | "userId">) {
  await requireAirport({ ...scope, userId: scope.authz.userId }, "policy:read");
  const [policy, people] = await Promise.all([
    db.safetyPolicy.findFirst({ where: { airportId: scope.airportId }, include: { versions: { include: { approval: { include: { approver: { select: { id: true, name: true } } } }, reviews: { orderBy: { reviewedAt: "desc" } }, communications: { orderBy: { communicatedAt: "desc" } }, objectives: { include: { owner: { select: { id: true, name: true } } }, orderBy: { dueDate: "asc" } } }, orderBy: { version: "desc" } } } }),
    db.membership.findMany({ where: { organizationId: scope.organizationId, status: "ACTIVE", deletedAt: null, user: { status: "ACTIVE", deletedAt: null }, airportAccesses: { some: { airportId: scope.airportId, status: "ACTIVE", deletedAt: null } } }, include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { user: { name: "asc" } } }),
  ]);
  return { policy, people: people.map((item) => item.user) };
}

export async function createSafetyPolicyVersion(scope: SafetyPolicyScope, input: PolicyContent & { safetyPolicyId?: string }) {
  assertNotLocalPreviewMutation(scope.actor);
  await requireAirport(scope, "policy:manage");
  const completeness = evaluatePolicyCompleteness(input);
  if (completeness.result !== "COMPLETE") throw new ConflictError(`Política incompleta: ${completeness.missingFields.join(", ")}.`);
  return db.$transaction(async (tx) => {
    const { safetyPolicyId: requestedPolicyId, ...content } = input;
    const existing = await tx.safetyPolicy.findFirst({ where: { airportId: scope.airportId } });
    if (requestedPolicyId && existing?.id !== requestedPolicyId) throw new NotFoundError("Política não encontrada neste aeródromo.");
    const policy = existing ?? await tx.safetyPolicy.create({ data: { airportId: scope.airportId, createdBy: scope.userId } });
    if (!existing) await recordAuditEvent(tx, { userId: scope.userId, organizationId: scope.organizationId, airportId: scope.airportId, action: "SAFETY_POLICY_CREATED", entityType: "SafetyPolicy", entityId: policy.id, newValue: policy as unknown as Prisma.InputJsonValue });
    const latest = await tx.safetyPolicyVersion.findFirst({ where: { safetyPolicyId: policy.id, airportId: scope.airportId }, orderBy: { version: "desc" } });
    const version = await tx.safetyPolicyVersion.create({ data: { safetyPolicyId: policy.id, airportId: scope.airportId, version: (latest?.version ?? 0) + 1, authoredBy: scope.userId, ...content } });
    await recordAuditEvent(tx, { userId: scope.userId, organizationId: scope.organizationId, airportId: scope.airportId, action: "SAFETY_POLICY_VERSION_CREATED", entityType: "SafetyPolicyVersion", entityId: version.id, newValue: version as unknown as Prisma.InputJsonValue, metadata: { version: version.version } });
    return version;
  });
}

async function changePolicyStatus(scope: SafetyPolicyScope, policyVersionId: string, from: string, to: "UNDER_REVIEW" | "ARCHIVED") {
  assertNotLocalPreviewMutation(scope.actor); await requireAirport(scope, "policy:manage");
  return db.$transaction(async (tx) => {
    const current = await tx.safetyPolicyVersion.findFirst({ where: { id: policyVersionId, airportId: scope.airportId } });
    if (!current) throw new NotFoundError("Versão da política não encontrada.");
    if (current.status !== from) throw new ConflictError(`A versão deve estar em ${from}.`);
    assertPolicyTransition(current.status, to);
    const updated = await tx.safetyPolicyVersion.update({ where: { id: current.id }, data: { status: to } });
    await recordAuditEvent(tx, { userId: scope.userId, organizationId: scope.organizationId, airportId: scope.airportId, action: `SAFETY_POLICY_${to}`, entityType: "SafetyPolicyVersion", entityId: current.id, previousValue: current as unknown as Prisma.InputJsonValue, newValue: updated as unknown as Prisma.InputJsonValue });
    return updated;
  });
}
export const submitSafetyPolicyForReview = (scope: SafetyPolicyScope, id: string) => changePolicyStatus(scope, id, "DRAFT", "UNDER_REVIEW");
export async function archiveSafetyPolicyVersion(scope: SafetyPolicyScope, id: string) {
  assertNotLocalPreviewMutation(scope.actor); await requireAirport(scope, "policy:manage");
  const current = await db.safetyPolicyVersion.findFirst({ where: { id, airportId: scope.airportId } });
  if (!current) throw new NotFoundError("Versão da política não encontrada.");
  if (!["DRAFT", "UNDER_REVIEW", "APPROVED", "SUPERSEDED"].includes(current.status)) throw new ConflictError("A versão ativa não pode ser arquivada.");
  return changePolicyStatus(scope, id, current.status, "ARCHIVED");
}

export async function approveSafetyPolicyVersion(scope: SafetyPolicyScope, policyVersionId: string, input: { rationale: string; evidenceReference?: string | null }, at = new Date()) {
  assertNotLocalPreviewMutation(scope.actor); await requireAirport(scope, "policy:manage");
  const current = await db.safetyPolicyVersion.findFirst({ where: { id: policyVersionId, airportId: scope.airportId } });
  if (!current) throw new NotFoundError("Versão da política não encontrada.");
  if (current.status !== "UNDER_REVIEW") throw new ConflictError("Somente versão em revisão pode ser aprovada.");
  const authority = await canPerformRegulatoryAction({ authz: scope.authz, organizationId: scope.organizationId, airportId: scope.airportId, userId: scope.userId, authorityCode: "APPROVE_SAFETY_POLICY", at });
  if (authority.decision !== "ALLOWED" || !authority.designationId) throw new ForbiddenError(authority.rationale);
  return db.$transaction(async (tx) => {
    const approval = await tx.safetyPolicyApproval.create({ data: { policyVersionId: current.id, airportId: scope.airportId, approvedBy: scope.userId, regulatoryDesignationId: authority.designationId!, authorityCode: "APPROVE_SAFETY_POLICY", rationale: input.rationale, evidenceReference: input.evidenceReference ?? null, approvedAt: at } });
    const updated = await tx.safetyPolicyVersion.update({ where: { id: current.id }, data: { status: "APPROVED" } });
    await recordAuditEvent(tx, { userId: scope.userId, organizationId: scope.organizationId, airportId: scope.airportId, action: "SAFETY_POLICY_APPROVED", entityType: "SafetyPolicyVersion", entityId: current.id, previousValue: current as unknown as Prisma.InputJsonValue, newValue: updated as unknown as Prisma.InputJsonValue, metadata: { approvalId: approval.id, designationId: authority.designationId, authorityCode: "APPROVE_SAFETY_POLICY", rationale: input.rationale } });
    return { version: updated, approval };
  });
}

export async function activateSafetyPolicyVersion(scope: SafetyPolicyScope, policyVersionId: string, effectiveFrom: Date) {
  assertNotLocalPreviewMutation(scope.actor); await requireAirport(scope, "policy:manage");
  return db.$transaction(async (tx) => {
    const current = await tx.safetyPolicyVersion.findFirst({ where: { id: policyVersionId, airportId: scope.airportId } });
    if (!current) throw new NotFoundError("Versão da política não encontrada.");
    if (current.status !== "APPROVED") throw new ConflictError("Somente versão aprovada pode entrar em vigor.");
    const active = await tx.safetyPolicyVersion.findFirst({ where: { airportId: scope.airportId, status: "ACTIVE" } });
    if (active) {
      if (active.effectiveFrom && effectiveFrom <= active.effectiveFrom) throw new ConflictError("A nova vigência deve ser posterior à versão ativa.");
      const superseded = await tx.safetyPolicyVersion.update({ where: { id: active.id }, data: { status: "SUPERSEDED", effectiveTo: calculateSupersededEffectiveTo(effectiveFrom) } });
      await recordAuditEvent(tx, { userId: scope.userId, organizationId: scope.organizationId, airportId: scope.airportId, action: "SAFETY_POLICY_SUPERSEDED", entityType: "SafetyPolicyVersion", entityId: active.id, previousValue: active as unknown as Prisma.InputJsonValue, newValue: superseded as unknown as Prisma.InputJsonValue, metadata: { supersededBy: current.id } });
    }
    const activated = await tx.safetyPolicyVersion.update({ where: { id: current.id }, data: { status: "ACTIVE", effectiveFrom } });
    await recordAuditEvent(tx, { userId: scope.userId, organizationId: scope.organizationId, airportId: scope.airportId, action: "SAFETY_POLICY_ACTIVATED", entityType: "SafetyPolicyVersion", entityId: current.id, previousValue: current as unknown as Prisma.InputJsonValue, newValue: activated as unknown as Prisma.InputJsonValue, metadata: { effectiveFrom: effectiveFrom.toISOString() } });
    return activated;
  });
}

export async function recordSafetyPolicyReview(scope: SafetyPolicyScope, policyVersionId: string, input: { reviewedAt: Date; nextReviewAt?: Date | null; reason: string; result: SafetyPolicyReviewResult; contentChanged: boolean }) {
  assertNotLocalPreviewMutation(scope.actor); await requireAirport(scope, "policy:manage");
  try { assertReviewDoesNotRewriteVersion(input.contentChanged); } catch (error) { throw new ConflictError((error as Error).message); }
  const current = await db.safetyPolicyVersion.findFirst({ where: { id: policyVersionId, airportId: scope.airportId, status: { in: ["APPROVED", "ACTIVE", "SUPERSEDED"] } } });
  if (!current) throw new NotFoundError("Versão controlada não encontrada.");
  if (input.nextReviewAt && input.nextReviewAt < input.reviewedAt) throw new ConflictError("A próxima revisão não pode anteceder a revisão atual.");
  return db.$transaction(async (tx) => { const review = await tx.safetyPolicyReview.create({ data: { policyVersionId: current.id, airportId: scope.airportId, reviewedBy: scope.userId, ...input } }); await recordAuditEvent(tx, { userId: scope.userId, organizationId: scope.organizationId, airportId: scope.airportId, action: "SAFETY_POLICY_REVIEW_RECORDED", entityType: "SafetyPolicyReview", entityId: review.id, newValue: review as unknown as Prisma.InputJsonValue, metadata: { policyVersionId: current.id } }); return review; });
}

export async function recordSafetyPolicyCommunication(scope: SafetyPolicyScope, policyVersionId: string, input: { audienceScope: string; communicationMethod: string; communicatedAt: Date; evidenceReference: string }) {
  assertNotLocalPreviewMutation(scope.actor); await requireAirport(scope, "policy:manage");
  const current = await db.safetyPolicyVersion.findFirst({ where: { id: policyVersionId, airportId: scope.airportId, status: { in: ["APPROVED", "ACTIVE", "SUPERSEDED"] } } });
  if (!current) throw new NotFoundError("Versão controlada não encontrada.");
  if (!input.evidenceReference.trim()) throw new ConflictError("A evidência de comunicação é obrigatória.");
  return db.$transaction(async (tx) => { const communication = await tx.safetyPolicyCommunication.create({ data: { policyVersionId: current.id, airportId: scope.airportId, recordedBy: scope.userId, ...input } }); await recordAuditEvent(tx, { userId: scope.userId, organizationId: scope.organizationId, airportId: scope.airportId, action: "SAFETY_POLICY_COMMUNICATION_RECORDED", entityType: "SafetyPolicyCommunication", entityId: communication.id, newValue: communication as unknown as Prisma.InputJsonValue, metadata: { policyVersionId: current.id, evidenceReference: input.evidenceReference } }); return communication; });
}

export async function createSafetyObjective(scope: SafetyPolicyScope, input: { policyVersionId: string; ownerUserId: string; title: string; description: string; rationale: string; intendedOutcome: string; measureCriterion: string; targetValue?: string | null; unit?: string | null; dueDate: Date; effectiveFrom: Date; effectiveTo?: Date | null }) {
  assertNotLocalPreviewMutation(scope.actor); await requireAirport(scope, "policy:manage"); await requireEligibleOwner(scope, input.ownerUserId);
  const completeness = evaluateObjectiveCompleteness(input); if (completeness.result !== "COMPLETE") throw new ConflictError(`Objetivo requer correção estrutural: ${completeness.result} ${completeness.missingFields.join(", ")}.`);
  const policyVersion = await db.safetyPolicyVersion.findFirst({ where: { id: input.policyVersionId, airportId: scope.airportId, status: "ACTIVE" } });
  if (!policyVersion) throw new NotFoundError("Política ativa não encontrada no aeródromo.");
  return db.$transaction(async (tx) => { const objective = await tx.safetyObjective.create({ data: { ...input, airportId: scope.airportId, createdBy: scope.userId } }); await recordAuditEvent(tx, { userId: scope.userId, organizationId: scope.organizationId, airportId: scope.airportId, action: "SAFETY_OBJECTIVE_CREATED", entityType: "SafetyObjective", entityId: objective.id, newValue: objective as unknown as Prisma.InputJsonValue, metadata: { policyVersionId: input.policyVersionId, structuralResult: completeness.result } }); return objective; });
}

export async function updateSafetyObjectiveStatus(scope: SafetyPolicyScope, objectiveId: string, status: Exclude<SafetyObjectiveStatus, "DRAFT">, observedResult?: string | null) {
  assertNotLocalPreviewMutation(scope.actor); await requireAirport(scope, "policy:manage");
  return db.$transaction(async (tx) => { const current = await tx.safetyObjective.findFirst({ where: { id: objectiveId, airportId: scope.airportId } }); if (!current) throw new NotFoundError("Objetivo não encontrado."); try { assertObjectiveTransition(current.status, status, observedResult); } catch (error) { throw new ConflictError((error as Error).message); } const updated = await tx.safetyObjective.update({ where: { id: current.id }, data: { status, observedResult: observedResult ?? current.observedResult } }); await recordAuditEvent(tx, { userId: scope.userId, organizationId: scope.organizationId, airportId: scope.airportId, action: "SAFETY_OBJECTIVE_STATUS_CHANGED", entityType: "SafetyObjective", entityId: current.id, previousValue: current as unknown as Prisma.InputJsonValue, newValue: updated as unknown as Prisma.InputJsonValue }); return updated; });
}
