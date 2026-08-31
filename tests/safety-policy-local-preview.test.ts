import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ requireSession: vi.fn(), authz: vi.fn(), createVersion: vi.fn(), approve: vi.fn(), createObjective: vi.fn(), audit: vi.fn() }));
vi.mock("@/server/auth/session", () => ({ requireSession: mocks.requireSession, getAuthorizationContext: mocks.authz }));
vi.mock("@/server/safety-policy/service", () => ({ createSafetyPolicyVersion: mocks.createVersion, getSafetyPolicyWorkspace: vi.fn(), approveSafetyPolicyVersion: mocks.approve, createSafetyObjective: mocks.createObjective }));
vi.mock("@/server/audit/service", () => ({ recordAuditEvent: mocks.audit }));
import { POST as createVersion } from "@/app/api/safety-policy/airports/[airportId]/policies/route";
import { POST as approve } from "@/app/api/safety-policy/airports/[airportId]/policies/[policyVersionId]/approve/route";
import { POST as objective } from "@/app/api/safety-policy/airports/[airportId]/objectives/route";
import { LOCAL_PREVIEW_AIRPORT_ID, LOCAL_PREVIEW_ORGANIZATION_ID, LOCAL_PREVIEW_USER_ID, LOCAL_PREVIEW_WRITE_MESSAGE } from "@/server/local-preview";
const req = () => new Request("http://localhost/api", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ organizationId: LOCAL_PREVIEW_ORGANIZATION_ID }) });
const policyParams = { params: Promise.resolve({ airportId: LOCAL_PREVIEW_AIRPORT_ID, policyVersionId: "version" }) };
async function blocked(response: Response) { expect(response.status).toBe(403); expect(await response.json()).toEqual({ error: { code: "FORBIDDEN", message: LOCAL_PREVIEW_WRITE_MESSAGE } }); }
describe("Etapa 04 — Local Preview read-only", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("LOCAL_PREVIEW_MODE", "true"); mocks.requireSession.mockResolvedValue({ id: "local-preview-session", userId: LOCAL_PREVIEW_USER_ID }); }); afterEach(() => vi.unstubAllEnvs());
  it("POL-16 — Local Preview não cria Política", async () => { await blocked(await createVersion(req(), { params: Promise.resolve({ airportId: LOCAL_PREVIEW_AIRPORT_ID }) })); expect(mocks.createVersion).not.toHaveBeenCalled(); });
  it("POL-17 — Local Preview não aprova Política", async () => { await blocked(await approve(req(), policyParams)); expect(mocks.approve).not.toHaveBeenCalled(); });
  it("POL-18 — Local Preview não cria objetivo", async () => { await blocked(await objective(req(), { params: Promise.resolve({ airportId: LOCAL_PREVIEW_AIRPORT_ID }) })); expect(mocks.createObjective).not.toHaveBeenCalled(); });
  it("POL-19 — Local Preview não alcança Prisma, autorização ou Audit Log", async () => { await createVersion(req(), { params: Promise.resolve({ airportId: LOCAL_PREVIEW_AIRPORT_ID }) }); await approve(req(), policyParams); await objective(req(), { params: Promise.resolve({ airportId: LOCAL_PREVIEW_AIRPORT_ID }) }); expect(mocks.authz).not.toHaveBeenCalled(); expect(mocks.createVersion).not.toHaveBeenCalled(); expect(mocks.approve).not.toHaveBeenCalled(); expect(mocks.createObjective).not.toHaveBeenCalled(); expect(mocks.audit).not.toHaveBeenCalled(); });
});
