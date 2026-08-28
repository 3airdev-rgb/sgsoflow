import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError, NotFoundError } from "@/server/errors";
import { requireAirportAccess, type AuthorizationContext } from "@/server/authorization/policies";

const mocks = vi.hoisted(() => ({
  airportFindFirst: vi.fn(), profileFindFirst: vi.fn(), profileCreate: vi.fn(), assessmentFindFirst: vi.fn(), auditCreate: vi.fn(),
}));
vi.mock("@/server/db", () => {
  const tx = {
    regulatoryProfile: { findFirst: mocks.profileFindFirst, create: mocks.profileCreate },
    auditLog: { create: mocks.auditCreate },
  };
  return { db: {
    airport: { findFirst: mocks.airportFindFirst },
    regulatoryProfile: { findFirst: mocks.profileFindFirst },
    applicabilityAssessment: { findFirst: mocks.assessmentFindFirst },
    $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
  } };
});

import { createRegulatoryProfile, executeRegulatoryAssessment, getRegulatoryAssessment } from "@/server/regulatory/service";

const userContext: AuthorizationContext = { userId: "user", organizations: [{ organizationId: "org-a", role: "USER", airports: [{ airportId: "airport-a", organizationId: "org-a", role: "USER" }] }] };
const adminContext: AuthorizationContext = { userId: "admin", organizations: [{ organizationId: "org-a", role: "ORGANIZATION_ADMIN", airports: [{ airportId: "airport-a", organizationId: "org-a", role: "AIRPORT_ADMIN" }] }] };
const profileInput = {
  effectiveFrom: new Date("2026-08-01"), aerodromeUse: "PUBLIC" as const, operationalClass: "CLASS_I" as const,
  hasOperationalCertificate: false, operatesRegularRBAC121: false, operatesRegularRBAC135: false, hasSGSO: false, hasPGSO: false,
  isMilitarySharedAerodrome: false,
};

describe("segurança regulatória multi-tenant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.airportFindFirst.mockResolvedValue({ id: "airport-a", organizationId: "org-a", status: "ACTIVE" });
    mocks.profileFindFirst.mockResolvedValue(null);
    mocks.auditCreate.mockResolvedValue({ id: "audit-1" });
  });

  it("T12 — usuário comum não altera RegulatoryProfile", () => {
    expect(() => requireAirportAccess(userContext, "org-a", "airport-a", "regulatory:profile:manage")).toThrow(ForbiddenError);
  });

  it("T13 — cross-tenant por airportId é bloqueado", () => {
    expect(() => requireAirportAccess(adminContext, "org-a", "airport-b", "regulatory:read")).toThrow(ForbiddenError);
  });

  it("T14 — regulatoryProfileId de outro tenant não é aceito", async () => {
    await expect(executeRegulatoryAssessment({ authz: adminContext, organizationId: "org-a", airportId: "airport-a", profileId: "profile-from-org-b", userId: "admin" })).rejects.toBeInstanceOf(NotFoundError);
    expect(mocks.profileFindFirst).toHaveBeenCalledWith({ where: { id: "profile-from-org-b", airportId: "airport-a", airport: { organizationId: "org-a" } } });
  });

  it("T15 — assessmentId de outro tenant não é revelado", async () => {
    await expect(getRegulatoryAssessment({ authz: adminContext, organizationId: "org-a", assessmentId: "assessment-from-org-b" })).rejects.toBeInstanceOf(NotFoundError);
    expect(mocks.assessmentFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "assessment-from-org-b", airport: { organizationId: "org-a" } } }));
  });

  it("T17 — criação de perfil gera Audit Log server-side", async () => {
    mocks.profileFindFirst.mockResolvedValueOnce({ version: 1 });
    mocks.profileCreate.mockResolvedValue({ id: "profile-2", airportId: "airport-a", version: 2, status: "DRAFT", effectiveFrom: profileInput.effectiveFrom });
    await createRegulatoryProfile({ authz: adminContext, organizationId: "org-a", airportId: "airport-a", userId: "admin", profile: profileInput });
    expect(mocks.auditCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "REGULATORY_PROFILE_VERSION_CREATED", organizationId: "org-a", airportId: "airport-a", userId: "admin" }) });
  });
});
