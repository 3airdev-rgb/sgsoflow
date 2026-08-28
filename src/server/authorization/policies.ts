import type { SystemRole } from "@prisma/client";
import { ForbiddenError } from "@/server/errors";

export type AirportGrant = { airportId: string; organizationId: string; role: SystemRole };
export type OrganizationGrant = { organizationId: string; role: SystemRole; airports: AirportGrant[] };
export type AuthorizationContext = { userId: string; organizations: OrganizationGrant[] };
export type Permission =
  | "organization:read" | "organization:manage" | "airport:read" | "airport:manage" | "context:switch"
  | "regulatory:read" | "regulatory:profile:manage" | "regulatory:rules:manage" | "regulatory:assess";

const rolePermissions: Record<SystemRole, ReadonlySet<Permission>> = {
  SYSTEM_ADMIN: new Set(["organization:read", "organization:manage", "airport:read", "airport:manage", "context:switch", "regulatory:read", "regulatory:profile:manage", "regulatory:rules:manage", "regulatory:assess"]),
  ORGANIZATION_ADMIN: new Set(["organization:read", "organization:manage", "airport:read", "airport:manage", "context:switch", "regulatory:read", "regulatory:profile:manage", "regulatory:assess"]),
  AIRPORT_ADMIN: new Set(["organization:read", "airport:read", "airport:manage", "context:switch", "regulatory:read", "regulatory:profile:manage", "regulatory:assess"]),
  USER: new Set(["organization:read", "airport:read", "context:switch", "regulatory:read"]),
};

export function requireOrganizationAccess(ctx: AuthorizationContext, organizationId: string, permission: Permission = "organization:read") {
  const grant = ctx.organizations.find((item) => item.organizationId === organizationId);
  if (!grant || !rolePermissions[grant.role].has(permission)) throw new ForbiddenError();
  return grant;
}

export function requireAirportAccess(ctx: AuthorizationContext, organizationId: string, airportId: string, permission: Permission = "airport:read") {
  const organization = requireOrganizationAccess(ctx, organizationId, "organization:read");
  if (organization.role === "SYSTEM_ADMIN" || organization.role === "ORGANIZATION_ADMIN") {
    const belongsToOrganization = organization.airports.some((item) => item.airportId === airportId && item.organizationId === organizationId);
    if (!belongsToOrganization || !rolePermissions[organization.role].has(permission)) throw new ForbiddenError();
    return organization;
  }
  const access = organization.airports.find((item) => item.airportId === airportId && item.organizationId === organizationId);
  if (!access || !rolePermissions[access.role].has(permission)) throw new ForbiddenError();
  return access;
}
