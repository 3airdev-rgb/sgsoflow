import { describe, expect, it } from "vitest";
import { ForbiddenError } from "@/server/errors";
import { requireAirportAccess, requireOrganizationAccess, type AuthorizationContext } from "@/server/authorization/policies";

const ctx: AuthorizationContext = { userId: "user-1", organizations: [{ organizationId: "org-a", role: "USER", airports: [{ airportId: "airport-a", organizationId: "org-a", role: "USER" }] }] };
describe("autorização multi-tenant", () => {
  it("autoriza Organization associada", () => expect(requireOrganizationAccess(ctx, "org-a")).toBeTruthy());
  it("autoriza Airport explicitamente associado", () => expect(requireAirportAccess(ctx, "org-a", "airport-a")).toBeTruthy());
  it("bloqueia acesso cross-tenant por Organization", () => expect(() => requireOrganizationAccess(ctx, "org-b")).toThrow(ForbiddenError));
  it("bloqueia Airport de outro tenant mesmo com ID conhecido", () => expect(() => requireAirportAccess(ctx, "org-a", "airport-b")).toThrow(ForbiddenError));
  it("bloqueia combinação de Organization e Airport manipulada", () => expect(() => requireAirportAccess(ctx, "org-b", "airport-a")).toThrow(ForbiddenError));
});
