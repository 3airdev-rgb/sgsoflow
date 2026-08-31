import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { recordAuditEvent } from "@/server/audit/service";
import { requireOrganizationAccess, type AuthorizationContext } from "@/server/authorization/policies";
import { ForbiddenError } from "@/server/errors";
import { assertNotLocalPreviewMutation, type LocalPreviewAwareActor } from "@/server/local-preview";

type CatalogScope = { actor: LocalPreviewAwareActor; authz: AuthorizationContext; organizationId: string; userId: string };

function authorize(scope: CatalogScope) {
  assertNotLocalPreviewMutation(scope.actor);
  const grant = requireOrganizationAccess(scope.authz, scope.organizationId, "governance:manage");
  if (grant.role !== "SYSTEM_ADMIN") throw new ForbiddenError("Somente SYSTEM_ADMIN pode alterar o catálogo global de governança.");
}

export async function saveRegulatoryRole(scope: CatalogScope, input: {
  id?: string; code: string; name: string; description: string; status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  holderMultiplicity: "SINGLE" | "MULTIPLE"; accumulationPolicy: "ALLOWED" | "REQUIRES_REVIEW";
}) {
  authorize(scope);
  return db.$transaction(async (tx) => {
    const previous = input.id ? await tx.regulatoryRole.findUnique({ where: { id: input.id } }) : null;
    const role = input.id
      ? await tx.regulatoryRole.update({ where: { id: input.id }, data: input })
      : await tx.regulatoryRole.create({ data: input });
    await recordAuditEvent(tx, { userId: scope.userId, organizationId: scope.organizationId, action: previous ? "REGULATORY_ROLE_UPDATED" : "REGULATORY_ROLE_CREATED", entityType: "RegulatoryRole", entityId: role.id, previousValue: previous as unknown as Prisma.InputJsonValue, newValue: role as unknown as Prisma.InputJsonValue });
    return role;
  });
}

export async function saveRegulatoryAuthority(scope: CatalogScope, input: { id?: string; code: string; name: string; description: string; status: "ACTIVE" | "INACTIVE" | "SUSPENDED" }) {
  authorize(scope);
  return db.$transaction(async (tx) => {
    const previous = input.id ? await tx.regulatoryAuthority.findUnique({ where: { id: input.id } }) : null;
    const authority = input.id
      ? await tx.regulatoryAuthority.update({ where: { id: input.id }, data: input })
      : await tx.regulatoryAuthority.create({ data: input });
    await recordAuditEvent(tx, { userId: scope.userId, organizationId: scope.organizationId, action: previous ? "REGULATORY_AUTHORITY_UPDATED" : "REGULATORY_AUTHORITY_CREATED", entityType: "RegulatoryAuthority", entityId: authority.id, previousValue: previous as unknown as Prisma.InputJsonValue, newValue: authority as unknown as Prisma.InputJsonValue });
    return authority;
  });
}

export async function mapRoleAuthority(scope: CatalogScope, input: { regulatoryRoleId: string; regulatoryAuthorityId: string; effectiveFrom: Date; effectiveTo?: Date | null }) {
  authorize(scope);
  return db.$transaction(async (tx) => {
    const mapping = await tx.regulatoryRoleAuthority.create({ data: { ...input, effectiveTo: input.effectiveTo ?? null } });
    await recordAuditEvent(tx, { userId: scope.userId, organizationId: scope.organizationId, action: "REGULATORY_ROLE_AUTHORITY_MAPPED", entityType: "RegulatoryRoleAuthority", entityId: mapping.id, newValue: mapping as unknown as Prisma.InputJsonValue });
    return mapping;
  });
}
