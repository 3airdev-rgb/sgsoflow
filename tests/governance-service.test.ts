import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  airportFindFirst: vi.fn(), membershipFindFirst: vi.fn(), roleFindFirst: vi.fn(), designationFindMany: vi.fn(),
  designationCreate: vi.fn(), designationFindFirst: vi.fn(), designationUpdate: vi.fn(), committeeFindFirst: vi.fn(), memberCreate: vi.fn(), profileFindFirst: vi.fn(), audit: vi.fn(),
}));
vi.mock("@/server/audit/service", () => ({ recordAuditEvent: mocks.audit }));
vi.mock("@/server/db", () => ({ db: {
  airport: { findFirst: mocks.airportFindFirst }, membership: { findFirst: mocks.membershipFindFirst }, regulatoryRole: { findFirst: mocks.roleFindFirst },
  regulatoryDesignation: { findMany: mocks.designationFindMany, findFirst: mocks.designationFindFirst }, regulatoryProfile: { findFirst: mocks.profileFindFirst },
  $transaction: vi.fn(async (callback: (tx: unknown) => unknown) => callback({
    regulatoryDesignation: { create: mocks.designationCreate, findFirst: mocks.designationFindFirst, findMany: mocks.designationFindMany, update: mocks.designationUpdate },
    safetyCommittee: { findFirst: mocks.committeeFindFirst }, safetyCommitteeMember: { create: mocks.memberCreate },
  })),
} }));

import { addSafetyCommitteeMember, createRegulatoryDesignation, revokeRegulatoryDesignation } from "@/server/governance/service";
import type { AuthorizationContext } from "@/server/authorization/policies";

const actor = { id: "session-1", userId: "admin-1" };
const adminAuthz: AuthorizationContext = { userId: "admin-1", organizations: [{ organizationId: "org-a", role: "AIRPORT_ADMIN", airports: [{ organizationId: "org-a", airportId: "airport-a", role: "AIRPORT_ADMIN" }] }] };
const userAuthz: AuthorizationContext = { userId: "user-1", organizations: [{ organizationId: "org-a", role: "USER", airports: [{ organizationId: "org-a", airportId: "airport-a", role: "USER" }] }] };
const scope = { actor, authz: adminAuthz, organizationId: "org-a", airportId: "airport-a", userId: "admin-1" };

describe("Etapa 03 — serviços multi-tenant e Audit Log", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.airportFindFirst.mockResolvedValue({ id: "airport-a", organizationId: "org-a" });
    mocks.membershipFindFirst.mockResolvedValue({ id: "membership-1" });
    mocks.roleFindFirst.mockResolvedValue({ id: "role-1", code: "ACCOUNTABLE_MANAGER", status: "ACTIVE", accumulationPolicy: "ALLOWED", holderMultiplicity: "SINGLE" });
    mocks.designationFindMany.mockResolvedValue([]);
    mocks.profileFindFirst.mockResolvedValue({ operationalClass: "CLASS_II", operatesRegularRBAC121: false, operatesRegularRBAC135: false });
    mocks.designationCreate.mockResolvedValue({ id: "designation-1", airportId: "airport-a", status: "DRAFT" });
    mocks.designationFindFirst.mockResolvedValue({ id: "designation-1", airportId: "airport-a", effectiveFrom: new Date("2026-01-01"), effectiveTo: null, status: "ACTIVE" });
    mocks.designationUpdate.mockResolvedValue({ id: "designation-1", airportId: "airport-a", status: "REVOKED" });
    mocks.committeeFindFirst.mockResolvedValue({ id: "committee-1", airportId: "airport-a", status: "ACTIVE" });
    mocks.memberCreate.mockResolvedValue({ id: "member-1", safetyCommitteeId: "committee-1", airportId: "airport-a" });
  });
  it("GOV-09 — cross-tenant por designationId é bloqueado", async () => {
    await expect(revokeRegulatoryDesignation({ ...scope, organizationId: "org-b" }, "designation-foreign", new Date())).rejects.toMatchObject({ status: 403 });
    expect(mocks.designationFindFirst).not.toHaveBeenCalled();
  });
  it("GOV-10 — cross-tenant por committeeId é bloqueado", async () => {
    await expect(addSafetyCommitteeMember({ ...scope, airportId: "airport-foreign" }, "committee-foreign", { memberUserId: "user-1", roleInCommittee: "Membro", memberType: "ADDITIONAL_MEMBER", effectiveFrom: new Date() })).rejects.toMatchObject({ status: 403 });
    expect(mocks.committeeFindFirst).not.toHaveBeenCalled();
  });
  it("GOV-11 — CSO aceita membro autorizado do mesmo tenant", async () => {
    const result = await addSafetyCommitteeMember(scope, "committee-1", { memberUserId: "user-1", roleInCommittee: "Membro", memberType: "ADDITIONAL_MEMBER", effectiveFrom: new Date("2026-08-29") });
    expect(result.id).toBe("member-1"); expect(mocks.membershipFindFirst).toHaveBeenCalled(); expect(mocks.audit).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: "SAFETY_COMMITTEE_MEMBER_ADDED", organizationId: "org-a", airportId: "airport-a" }));
  });
  it("GOV-12 — usuário sem autorização técnica não gerencia designações", async () => {
    await expect(createRegulatoryDesignation({ ...scope, actor: { id: "session-user", userId: "user-1" }, authz: userAuthz, userId: "user-1" }, { holderUserId: "user-1", regulatoryRoleId: "role-1", designationDate: new Date(), effectiveFrom: new Date() })).rejects.toMatchObject({ status: 403 });
    expect(mocks.designationCreate).not.toHaveBeenCalled();
  });
  it("GOV-13 — Audit Log é gerado para criação de designação", async () => {
    await createRegulatoryDesignation(scope, { holderUserId: "user-1", regulatoryRoleId: "role-1", designationDate: new Date("2026-08-29"), effectiveFrom: new Date("2026-08-29") });
    expect(mocks.audit).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: "REGULATORY_DESIGNATION_CREATED", userId: "admin-1", organizationId: "org-a", airportId: "airport-a", entityId: "designation-1" }));
  });
  it("GOV-14 — Audit Log é gerado para revogação", async () => {
    await revokeRegulatoryDesignation(scope, "designation-1", new Date("2026-08-29"));
    expect(mocks.audit).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: "REGULATORY_DESIGNATION_REVOKED", entityId: "designation-1" }));
  });
});
