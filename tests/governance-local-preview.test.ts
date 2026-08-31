import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireSession: vi.fn(), getAuthorizationContext: vi.fn(), createDesignation: vi.fn(), createCommittee: vi.fn(), recordNotification: vi.fn(), addMember: vi.fn() }));
vi.mock("@/server/auth/session", () => ({ requireSession: mocks.requireSession, getAuthorizationContext: mocks.getAuthorizationContext }));
vi.mock("@/server/governance/service", () => ({ createRegulatoryDesignation: mocks.createDesignation, createSafetyCommittee: mocks.createCommittee, recordAnacDesignationNotification: mocks.recordNotification, addSafetyCommitteeMember: mocks.addMember }));

import { POST as createDesignationRoute } from "@/app/api/governance/airports/[airportId]/designations/route";
import { POST as createCommitteeRoute } from "@/app/api/governance/airports/[airportId]/committees/route";
import { POST as notifyRoute } from "@/app/api/governance/airports/[airportId]/designations/[designationId]/notification/route";
import { POST as addMemberRoute } from "@/app/api/governance/airports/[airportId]/committees/[committeeId]/members/route";
import { LOCAL_PREVIEW_AIRPORT_ID, LOCAL_PREVIEW_ORGANIZATION_ID, LOCAL_PREVIEW_USER_ID, LOCAL_PREVIEW_WRITE_MESSAGE } from "@/server/local-preview";

function request(body: Record<string, unknown>) { return new Request("http://localhost/api/governance", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); }
async function expectPreviewForbidden(response: Response) { expect(response.status).toBe(403); expect(await response.json()).toEqual({ error: { code: "FORBIDDEN", message: LOCAL_PREVIEW_WRITE_MESSAGE } }); }

describe("Etapa 03 — Local Preview read-only", () => {
  beforeEach(() => {
    vi.clearAllMocks(); vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("LOCAL_PREVIEW_MODE", "true");
    mocks.requireSession.mockResolvedValue({ id: "local-preview-session", userId: LOCAL_PREVIEW_USER_ID });
  });
  afterEach(() => vi.unstubAllEnvs());
  it("GOV-15 — Local Preview tenta criar designação e recebe 403", async () => {
    await expectPreviewForbidden(await createDesignationRoute(request({ organizationId: LOCAL_PREVIEW_ORGANIZATION_ID }), { params: Promise.resolve({ airportId: LOCAL_PREVIEW_AIRPORT_ID }) }));
  });
  it("GOV-16 — Local Preview tenta alterar CSO e recebe 403", async () => {
    await expectPreviewForbidden(await createCommitteeRoute(request({ organizationId: LOCAL_PREVIEW_ORGANIZATION_ID }), { params: Promise.resolve({ airportId: LOCAL_PREVIEW_AIRPORT_ID }) }));
  });
  it("GOV-17 — mutações da Etapa 03 não alcançam Prisma nem serviço", async () => {
    await createDesignationRoute(request({ organizationId: LOCAL_PREVIEW_ORGANIZATION_ID }), { params: Promise.resolve({ airportId: LOCAL_PREVIEW_AIRPORT_ID }) });
    await createCommitteeRoute(request({ organizationId: LOCAL_PREVIEW_ORGANIZATION_ID }), { params: Promise.resolve({ airportId: LOCAL_PREVIEW_AIRPORT_ID }) });
    expect(mocks.getAuthorizationContext).not.toHaveBeenCalled(); expect(mocks.createDesignation).not.toHaveBeenCalled(); expect(mocks.createCommittee).not.toHaveBeenCalled();
  });
  it("GOV-AUD-16 — Local Preview bloqueia registro de notificação ANAC antes do serviço", async () => {
    await expectPreviewForbidden(await notifyRoute(request({ organizationId: LOCAL_PREVIEW_ORGANIZATION_ID }), { params: Promise.resolve({ airportId: LOCAL_PREVIEW_AIRPORT_ID, designationId: "designation" }) }));
    expect(mocks.recordNotification).not.toHaveBeenCalled();
  });
  it("GOV-AUD-17 — Local Preview bloqueia inclusão em CSO antes do serviço", async () => {
    await expectPreviewForbidden(await addMemberRoute(request({ organizationId: LOCAL_PREVIEW_ORGANIZATION_ID }), { params: Promise.resolve({ airportId: LOCAL_PREVIEW_AIRPORT_ID, committeeId: "committee" }) }));
    expect(mocks.addMember).not.toHaveBeenCalled(); expect(mocks.getAuthorizationContext).not.toHaveBeenCalled();
  });
});
