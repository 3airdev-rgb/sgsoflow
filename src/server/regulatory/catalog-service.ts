import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { recordAuditEvent } from "@/server/audit/service";
import { requireOrganizationAccess, type AuthorizationContext } from "@/server/authorization/policies";
import { NotFoundError } from "@/server/errors";
import { conditionSchema } from "./engine";
import { assertNotLocalPreviewMutation } from "@/server/local-preview";

type RequirementInput = {
  id?: string;
  regulatorySourceId: string;
  section: string;
  subsection?: string | null;
  title: string;
  summary: string;
  requirementType: "OBR" | "FC" | "REC" | "PROD";
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
};

export async function saveRegulatoryRequirement(input: { authz: AuthorizationContext; organizationId: string; userId: string; requirement: RequirementInput }) {
  assertNotLocalPreviewMutation({ userId: input.authz.userId });
  requireOrganizationAccess(input.authz, input.organizationId, "regulatory:rules:manage");
  const existing = input.requirement.id ? await db.regulatoryRequirement.findUnique({ where: { id: input.requirement.id } }) : null;
  const source = await db.regulatorySource.findUnique({ where: { id: input.requirement.regulatorySourceId } });
  if (!source) throw new NotFoundError("Fonte regulatória não encontrada.");
  return db.$transaction(async (tx) => {
    const requirement = existing
      ? await tx.regulatoryRequirement.update({ where: { id: existing.id }, data: input.requirement })
      : await tx.regulatoryRequirement.create({ data: input.requirement });
    await recordAuditEvent(tx, {
      userId: input.userId, organizationId: input.organizationId,
      action: existing ? "REGULATORY_REQUIREMENT_UPDATED" : "REGULATORY_REQUIREMENT_CREATED",
      entityType: "RegulatoryRequirement", entityId: requirement.id,
      previousValue: existing as unknown as Prisma.InputJsonValue | undefined,
      newValue: { section: requirement.section, status: requirement.status, sourceId: requirement.regulatorySourceId },
    });
    return requirement;
  });
}

export async function createApplicabilityRuleVersion(input: {
  authz: AuthorizationContext;
  organizationId: string;
  userId: string;
  rule: {
    regulatoryRequirementId: string;
    conditions: unknown;
    resultWhenMatched: "APPLICABLE" | "NOT_APPLICABLE" | "CONDITIONAL" | "REVIEW_REQUIRED";
    managementRegime?: "SGSO" | "PGSO" | "CRITICAL_SAFETY_ASPECTS" | "REVIEW_REQUIRED" | null;
    rationaleTemplate: string;
    effectiveFrom: Date;
    effectiveTo?: Date | null;
  };
}) {
  assertNotLocalPreviewMutation({ userId: input.authz.userId });
  requireOrganizationAccess(input.authz, input.organizationId, "regulatory:rules:manage");
  const conditions = conditionSchema.parse(input.rule.conditions);
  const requirement = await db.regulatoryRequirement.findUnique({ where: { id: input.rule.regulatoryRequirementId } });
  if (!requirement) throw new NotFoundError("Requisito regulatório não encontrado.");
  return db.$transaction(async (tx) => {
    const latest = await tx.applicabilityRule.findFirst({ where: { regulatoryRequirementId: requirement.id }, orderBy: { version: "desc" } });
    const rule = await tx.applicabilityRule.create({
      data: { ...input.rule, conditions: conditions as Prisma.InputJsonValue, version: (latest?.version ?? 0) + 1 },
    });
    await recordAuditEvent(tx, {
      userId: input.userId, organizationId: input.organizationId,
      action: latest ? "APPLICABILITY_RULE_VERSION_CREATED" : "APPLICABILITY_RULE_CREATED",
      entityType: "ApplicabilityRule", entityId: rule.id,
      newValue: { regulatoryRequirementId: requirement.id, version: rule.version, resultWhenMatched: rule.resultWhenMatched },
    });
    return rule;
  });
}
