import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(), getAuthorizationContext: vi.fn(), switchContext: vi.fn(),
  createProfile: vi.fn(), activateProfile: vi.fn(), executeAssessment: vi.fn(), getWorkspace: vi.fn(),
  dbRead: vi.fn(), transaction: vi.fn(), audit: vi.fn(),
}));

vi.mock("@/server/auth/session", () => ({ requireSession: mocks.requireSession, getAuthorizationContext: mocks.getAuthorizationContext }));
vi.mock("@/server/context/service", () => ({ switchContext: mocks.switchContext }));
vi.mock("@/server/regulatory/service", () => ({
  createRegulatoryProfile: mocks.createProfile, activateRegulatoryProfile: mocks.activateProfile,
  executeRegulatoryAssessment: mocks.executeAssessment, getRegulatoryWorkspace: mocks.getWorkspace,
}));
vi.mock("@/server/audit/service", () => ({ recordAuditEvent: mocks.audit }));
vi.mock("@/server/db", () => ({ db: {
  regulatoryRequirement: { findUnique: mocks.dbRead }, regulatorySource: { findUnique: mocks.dbRead },
  applicabilityRule: { findFirst: mocks.dbRead }, $transaction: mocks.transaction,
} }));

import { PUT as switchContextRoute } from "@/app/api/context/route";
import { GET as readProfilesRoute, POST as createProfileRoute } from "@/app/api/regulatory/airports/[airportId]/profiles/route";
import { POST as activateProfileRoute } from "@/app/api/regulatory/airports/[airportId]/profiles/[profileId]/activate/route";
import { POST as createAssessmentRoute } from "@/app/api/regulatory/airports/[airportId]/assessments/route";
import { createApplicabilityRuleVersion, saveRegulatoryRequirement } from "@/server/regulatory/catalog-service";
import { requireOrganizationAccess, type AuthorizationContext } from "@/server/authorization/policies";
import {
  assertNotLocalPreviewMutation, authenticateLocalPreview, getLocalPreviewSession,
  isLocalPreviewEnabled, LOCAL_PREVIEW_AIRPORT_ID, LOCAL_PREVIEW_ORGANIZATION_ID,
  LOCAL_PREVIEW_USER_ID, LOCAL_PREVIEW_WRITE_MESSAGE,
} from "@/server/local-preview";

const previewSession = { id: "local-preview-session", userId: LOCAL_PREVIEW_USER_ID };
const previewAuthz: AuthorizationContext = {
  userId: LOCAL_PREVIEW_USER_ID,
  organizations: [{ organizationId: LOCAL_PREVIEW_ORGANIZATION_ID, role: "ORGANIZATION_ADMIN", airports: [{ airportId: LOCAL_PREVIEW_AIRPORT_ID, organizationId: LOCAL_PREVIEW_ORGANIZATION_ID, role: "AIRPORT_ADMIN" }] }],
};

function enablePreview() {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("LOCAL_PREVIEW_MODE", "true");
  vi.stubEnv("LOCAL_PREVIEW_EMAIL", "admin@example.local");
  vi.stubEnv("LOCAL_PREVIEW_PASSWORD", "change-me-before-production");
  vi.stubEnv("LOCAL_PREVIEW_SESSION_TOKEN", "local-test-session-token");
  mocks.requireSession.mockResolvedValue(previewSession);
}

function mutationRequest(body: unknown = {}) {
  return new Request("http://localhost/api/local-preview-test", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

async function expectForbidden(response: Response) {
  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({ error: { code: "FORBIDDEN", message: LOCAL_PREVIEW_WRITE_MESSAGE } });
}

describe("Local Preview — bloqueio server-side de mutações", () => {
  beforeEach(() => { vi.clearAllMocks(); enablePreview(); });
  afterEach(() => { vi.unstubAllEnvs(); });

  it("LP-01 — rejeita criação de RegulatoryProfile antes do serviço", async () => {
    await expectForbidden(await createProfileRoute(mutationRequest(), { params: Promise.resolve({ airportId: LOCAL_PREVIEW_AIRPORT_ID }) }));
    expect(mocks.createProfile).not.toHaveBeenCalled();
  });

  it("LP-02 — rejeita ativação ou supersession de RegulatoryProfile", async () => {
    await expectForbidden(await activateProfileRoute(mutationRequest(), { params: Promise.resolve({ airportId: LOCAL_PREVIEW_AIRPORT_ID, profileId: "profile-local" }) }));
    expect(mocks.activateProfile).not.toHaveBeenCalled();
  });

  it("LP-03 — rejeita criação de ApplicabilityAssessment", async () => {
    await expectForbidden(await createAssessmentRoute(mutationRequest(), { params: Promise.resolve({ airportId: LOCAL_PREVIEW_AIRPORT_ID }) }));
    expect(mocks.executeAssessment).not.toHaveBeenCalled();
  });

  it("LP-04 — rejeita alteração de RegulatoryRequirement antes do Prisma", async () => {
    await expect(saveRegulatoryRequirement({ authz: previewAuthz, organizationId: LOCAL_PREVIEW_ORGANIZATION_ID, userId: LOCAL_PREVIEW_USER_ID, requirement: {
      regulatorySourceId: "source-local", section: "153.51", title: "Teste", summary: "Teste", requirementType: "OBR", effectiveFrom: new Date("2026-01-01"),
    } })).rejects.toMatchObject({ status: 403, message: LOCAL_PREVIEW_WRITE_MESSAGE });
    expect(mocks.dbRead).not.toHaveBeenCalled(); expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("LP-05 — rejeita alteração de ApplicabilityRule antes do Prisma", async () => {
    await expect(createApplicabilityRuleVersion({ authz: previewAuthz, organizationId: LOCAL_PREVIEW_ORGANIZATION_ID, userId: LOCAL_PREVIEW_USER_ID, rule: {
      regulatoryRequirementId: "requirement-local", conditions: { field: "aerodromeUse", operator: "EQ", value: "PUBLIC" },
      resultWhenMatched: "APPLICABLE", rationaleTemplate: "Teste", effectiveFrom: new Date("2026-01-01"),
    } })).rejects.toMatchObject({ status: 403, message: LOCAL_PREVIEW_WRITE_MESSAGE });
    expect(mocks.dbRead).not.toHaveBeenCalled(); expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("LP-06 — rejeita troca de contexto com IDs manipulados", async () => {
    const request = new Request("http://localhost/api/context", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ organizationId: "00000000-0000-4000-8000-999999999998", airportId: "00000000-0000-4000-8000-999999999999" }) });
    await expectForbidden(await switchContextRoute(request));
    expect(mocks.getAuthorizationContext).not.toHaveBeenCalled(); expect(mocks.switchContext).not.toHaveBeenCalled();
  });

  it("LP-07 — mutação bloqueada não produz Audit Log persistido", async () => {
    await expect(saveRegulatoryRequirement({ authz: previewAuthz, organizationId: LOCAL_PREVIEW_ORGANIZATION_ID, userId: LOCAL_PREVIEW_USER_ID, requirement: {
      regulatorySourceId: "source-local", section: "153.53", title: "Teste", summary: "Teste", requirementType: "OBR", effectiveFrom: new Date("2026-01-01"),
    } })).rejects.toMatchObject({ status: 403 });
    expect(mocks.audit).not.toHaveBeenCalled(); expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("LP-08 — usuário real autorizado não é bloqueado pela política demo", () => {
    const realAuthz: AuthorizationContext = { userId: "real-admin", organizations: [{ organizationId: "org-real", role: "ORGANIZATION_ADMIN", airports: [{ airportId: "airport-real", organizationId: "org-real", role: "AIRPORT_ADMIN" }] }] };
    expect(() => assertNotLocalPreviewMutation({ id: "session-real", userId: realAuthz.userId })).not.toThrow();
    expect(() => requireOrganizationAccess(realAuthz, "org-real", "regulatory:profile:manage")).not.toThrow();
  });

  it("LP-09 — produção mantém o modo e a credencial demo desabilitados", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(isLocalPreviewEnabled()).toBe(false);
    expect(authenticateLocalPreview("admin@example.local", "change-me-before-production")).toBeNull();
    expect(() => assertNotLocalPreviewMutation(previewSession)).not.toThrow();
  });

  it("LP-10 — leitura local continua funcionando sem alcançar Prisma", async () => {
    expect(authenticateLocalPreview("admin@example.local", "change-me-before-production")?.token).toBe("local-test-session-token");
    expect(getLocalPreviewSession("local-test-session-token")).toMatchObject({ localPreview: true, activeOrganizationId: LOCAL_PREVIEW_ORGANIZATION_ID, activeAirportId: LOCAL_PREVIEW_AIRPORT_ID });
    const response = await readProfilesRoute(new Request(`http://localhost/api/regulatory/airports/${LOCAL_PREVIEW_AIRPORT_ID}/profiles?organizationId=${LOCAL_PREVIEW_ORGANIZATION_ID}`), { params: Promise.resolve({ airportId: LOCAL_PREVIEW_AIRPORT_ID }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ profiles: [], assessments: [] });
    expect(mocks.getWorkspace).not.toHaveBeenCalled(); expect(mocks.dbRead).not.toHaveBeenCalled();
  });
});
