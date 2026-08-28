import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  userFindFirst: vi.fn(), sessionCreate: vi.fn(), auditCreate: vi.fn(), sessionFindUnique: vi.fn(), sessionUpdate: vi.fn(), compare: vi.fn(),
}));
vi.mock("bcryptjs", () => ({ compare: mocks.compare }));
vi.mock("@/server/db", () => ({ db: {
  user: { findFirst: mocks.userFindFirst }, session: { create: mocks.sessionCreate, findUnique: mocks.sessionFindUnique }, auditLog: { create: mocks.auditCreate },
  $transaction: vi.fn(async (callback: (tx: unknown) => unknown) => callback({ session: { update: mocks.sessionUpdate }, auditLog: { create: mocks.auditCreate } })),
} }));

import { authenticate } from "@/server/auth/service";
import { switchContext } from "@/server/context/service";
import { ForbiddenError } from "@/server/errors";
import type { AuthorizationContext } from "@/server/authorization/policies";

const authz: AuthorizationContext = { userId: "user-1", organizations: [{ organizationId: "org-a", role: "USER", airports: [{ airportId: "airport-a", organizationId: "org-a", role: "USER" }] }] };
describe("autenticação, contexto e auditoria", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.userFindFirst.mockResolvedValue({ id: "user-1", name: "Ana", email: "ana@example.com", passwordHash: "hash" }); mocks.compare.mockResolvedValue(true); mocks.sessionCreate.mockResolvedValue({ id: "session-1" }); mocks.auditCreate.mockResolvedValue({ id: "audit-1" }); mocks.sessionFindUnique.mockResolvedValue({ id: "session-1", userId: "user-1", activeOrganizationId: null, activeAirportId: null, revokedAt: null }); mocks.sessionUpdate.mockResolvedValue({ id: "session-1", activeOrganizationId: "org-a", activeAirportId: "airport-a" }); });
  it("autentica, cria sessão opaca e registra login", async () => { const result = await authenticate("ana@example.com", "senha-segura-123"); expect(result.user.id).toBe("user-1"); expect(mocks.sessionCreate).toHaveBeenCalledOnce(); expect(mocks.auditCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "AUTH_LOGIN", userId: "user-1" }) }); });
  it("rejeita credenciais inválidas", async () => { mocks.compare.mockResolvedValue(false); await expect(authenticate("ana@example.com", "senha-incorreta")).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" }); expect(mocks.sessionCreate).not.toHaveBeenCalled(); });
  it("muda contexto autorizado e cria Audit Log", async () => { await switchContext({ sessionId: "session-1", organizationId: "org-a", airportId: "airport-a", authz }); expect(mocks.sessionUpdate).toHaveBeenCalledOnce(); expect(mocks.auditCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "CONTEXT_SWITCHED", organizationId: "org-a", airportId: "airport-a" }) }); });
  it("nega mudança de contexto não autorizada sem persistir", async () => { await expect(switchContext({ sessionId: "session-1", organizationId: "org-b", airportId: null, authz })).rejects.toBeInstanceOf(ForbiddenError); expect(mocks.sessionUpdate).not.toHaveBeenCalled(); expect(mocks.auditCreate).not.toHaveBeenCalled(); });
});
