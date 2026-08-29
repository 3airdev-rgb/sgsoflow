import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { recordAuditEvent } from "@/server/audit/service";
import { requireAirportAccess, type AuthorizationContext } from "@/server/authorization/policies";
import { ConflictError, NotFoundError } from "@/server/errors";
import { evaluateRegulatoryApplicability } from "./engine";
import { assertValidProfilePeriod } from "./profile-versioning";
import { assertNotLocalPreviewMutation } from "@/server/local-preview";

type ProfileInput = {
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  aerodromeUse: "PUBLIC" | "PRIVATE" | null;
  operationalClass: "CLASS_I" | "CLASS_II" | "CLASS_III" | "CLASS_IV" | null;
  hasOperationalCertificate: boolean | null;
  isMilitarySharedAerodrome: boolean | null;
  certificateNumber?: string | null;
  operatesRegularRBAC121: boolean | null;
  operatesRegularRBAC135: boolean | null;
  hasSGSO: boolean | null;
  hasPGSO: boolean | null;
  regulatoryNotes?: string | null;
};

async function requireScopedAirport(authz: AuthorizationContext, organizationId: string, airportId: string, permission: "regulatory:read" | "regulatory:profile:manage" | "regulatory:assess") {
  requireAirportAccess(authz, organizationId, airportId, permission);
  const airport = await db.airport.findFirst({ where: { id: airportId, organizationId, status: "ACTIVE", deletedAt: null } });
  if (!airport) throw new NotFoundError("Aeródromo não encontrado no contexto informado.");
  return airport;
}

export async function getRegulatoryWorkspace(input: { authz: AuthorizationContext; organizationId: string; airportId: string }) {
  const airport = await requireScopedAirport(input.authz, input.organizationId, input.airportId, "regulatory:read");
  const [profiles, assessments] = await Promise.all([
    db.regulatoryProfile.findMany({ where: { airportId: input.airportId }, orderBy: { version: "desc" } }),
    db.applicabilityAssessment.findMany({
      where: { airportId: input.airportId, airport: { organizationId: input.organizationId } },
      include: { regulatoryProfile: { select: { version: true } }, items: { include: { regulatoryRequirement: { select: { section: true, title: true } } }, orderBy: { createdAt: "asc" } } },
      orderBy: { evaluatedAt: "desc" },
    }),
  ]);
  return { airport, profiles, assessments };
}

export async function createRegulatoryProfile(input: { authz: AuthorizationContext; organizationId: string; airportId: string; userId: string; profile: ProfileInput }) {
  assertNotLocalPreviewMutation({ userId: input.authz.userId });
  await requireScopedAirport(input.authz, input.organizationId, input.airportId, "regulatory:profile:manage");
  assertValidProfilePeriod(input.profile.effectiveFrom, input.profile.effectiveTo ?? null);
  return db.$transaction(async (tx) => {
    const latest = await tx.regulatoryProfile.findFirst({ where: { airportId: input.airportId }, orderBy: { version: "desc" }, select: { version: true } });
    const profile = await tx.regulatoryProfile.create({
      data: { ...input.profile, effectiveTo: input.profile.effectiveTo ?? null, airportId: input.airportId, createdBy: input.userId, version: (latest?.version ?? 0) + 1, status: "DRAFT" },
    });
    await recordAuditEvent(tx, {
      userId: input.userId, organizationId: input.organizationId, airportId: input.airportId,
      action: profile.version === 1 ? "REGULATORY_PROFILE_CREATED" : "REGULATORY_PROFILE_VERSION_CREATED",
      entityType: "RegulatoryProfile", entityId: profile.id,
      newValue: { version: profile.version, status: profile.status, effectiveFrom: profile.effectiveFrom.toISOString() },
    });
    return profile;
  });
}

export async function activateRegulatoryProfile(input: { authz: AuthorizationContext; organizationId: string; airportId: string; profileId: string; userId: string }) {
  assertNotLocalPreviewMutation({ userId: input.authz.userId });
  await requireScopedAirport(input.authz, input.organizationId, input.airportId, "regulatory:profile:manage");
  const target = await db.regulatoryProfile.findFirst({ where: { id: input.profileId, airportId: input.airportId, airport: { organizationId: input.organizationId } } });
  if (!target) throw new NotFoundError("Perfil regulatório não encontrado no aeródromo informado.");
  if (target.status === "SUPERSEDED") throw new ConflictError("Uma versão substituída não pode ser reativada.");
  return db.$transaction(async (tx) => {
    const previous = await tx.regulatoryProfile.findMany({ where: { airportId: input.airportId, status: "ACTIVE", id: { not: target.id } } });
    if (previous.some((profile) => profile.effectiveFrom >= target.effectiveFrom)) {
      throw new ConflictError("A nova versão deve iniciar após a versão ativa atual.");
    }
    for (const profile of previous) {
      const effectiveTo = profile.effectiveTo ?? new Date(target.effectiveFrom.getTime() - 86_400_000);
      await tx.regulatoryProfile.update({ where: { id: profile.id }, data: { status: "SUPERSEDED", effectiveTo } });
      await recordAuditEvent(tx, {
        userId: input.userId, organizationId: input.organizationId, airportId: input.airportId,
        action: "REGULATORY_PROFILE_SUPERSEDED", entityType: "RegulatoryProfile", entityId: profile.id,
        previousValue: { status: profile.status }, newValue: { status: "SUPERSEDED", effectiveTo: effectiveTo.toISOString() },
      });
    }
    const activated = await tx.regulatoryProfile.update({ where: { id: target.id }, data: { status: "ACTIVE" } });
    await recordAuditEvent(tx, {
      userId: input.userId, organizationId: input.organizationId, airportId: input.airportId,
      action: "REGULATORY_PROFILE_ACTIVATED", entityType: "RegulatoryProfile", entityId: activated.id,
      previousValue: { status: target.status }, newValue: { status: activated.status, version: activated.version },
    });
    return activated;
  });
}

export async function executeRegulatoryAssessment(input: { authz: AuthorizationContext; organizationId: string; airportId: string; profileId: string; userId: string; evaluatedAt?: Date }) {
  assertNotLocalPreviewMutation({ userId: input.authz.userId });
  await requireScopedAirport(input.authz, input.organizationId, input.airportId, "regulatory:assess");
  const evaluatedAt = input.evaluatedAt ?? new Date();
  const profile = await db.regulatoryProfile.findFirst({ where: { id: input.profileId, airportId: input.airportId, airport: { organizationId: input.organizationId } } });
  if (!profile) throw new NotFoundError("Perfil regulatório não encontrado no aeródromo informado.");
  const rules = await db.applicabilityRule.findMany({
    where: {
      status: "ACTIVE", effectiveFrom: { lte: evaluatedAt }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: evaluatedAt } }],
      regulatoryRequirement: { status: "ACTIVE", effectiveFrom: { lte: evaluatedAt }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: evaluatedAt } }] },
    },
    include: { regulatoryRequirement: { select: { id: true, section: true, title: true } } },
    orderBy: [{ regulatoryRequirement: { section: "asc" } }, { version: "desc" }],
  });
  const latestRules = [...new Map(rules.map((rule) => [rule.regulatoryRequirementId, rule])).values()];
  const result = evaluateRegulatoryApplicability(profile, latestRules.map((rule) => ({
    id: rule.id, version: rule.version, conditions: rule.conditions, resultWhenMatched: rule.resultWhenMatched,
    managementRegime: rule.managementRegime, rationaleTemplate: rule.rationaleTemplate, requirement: rule.regulatoryRequirement,
  })));
  return db.$transaction(async (tx) => {
    const assessment = await tx.applicabilityAssessment.create({
      data: {
        airportId: input.airportId, regulatoryProfileId: profile.id, evaluatedAt, evaluatedBy: input.userId,
        engineVersion: result.engineVersion, managementRegime: result.managementRegime, overallResult: result.overallResult,
        rationale: result.rationale,
        items: { create: result.items.map((item) => ({
          regulatoryRequirementId: item.regulatoryRequirementId, applicabilityRuleId: item.applicabilityRuleId,
          ruleVersion: item.ruleVersion, applicabilityStatus: item.applicabilityStatus, rationale: item.rationale,
          evaluationMetadata: item.evaluationMetadata as Prisma.InputJsonValue,
        })) },
      },
      include: { items: true },
    });
    await recordAuditEvent(tx, {
      userId: input.userId, organizationId: input.organizationId, airportId: input.airportId,
      action: "APPLICABILITY_ASSESSMENT_EXECUTED", entityType: "ApplicabilityAssessment", entityId: assessment.id,
      newValue: { profileId: profile.id, profileVersion: profile.version, engineVersion: result.engineVersion, managementRegime: result.managementRegime, overallResult: result.overallResult },
    });
    return assessment;
  });
}

export async function getRegulatoryAssessment(input: { authz: AuthorizationContext; organizationId: string; assessmentId: string }) {
  const assessment = await db.applicabilityAssessment.findFirst({
    where: { id: input.assessmentId, airport: { organizationId: input.organizationId } },
    include: { airport: { select: { id: true, organizationId: true } }, regulatoryProfile: true, items: { include: { regulatoryRequirement: true, applicabilityRule: true } } },
  });
  if (!assessment) throw new NotFoundError("Avaliação regulatória não encontrada.");
  requireAirportAccess(input.authz, input.organizationId, assessment.airportId, "regulatory:read");
  return assessment;
}
