import { afterEach, describe, expect, it, vi } from "vitest";
import { authenticateLocalPreview, getLocalPreviewSession, isLocalPreviewEnabled } from "@/server/local-preview";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("modo de visualização local", () => {
  it("permanece desativado em produção", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("LOCAL_PREVIEW_MODE", "true");
    expect(isLocalPreviewEnabled()).toBe(false);
  });

  it("aceita somente as credenciais configuradas em desenvolvimento", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("LOCAL_PREVIEW_MODE", "true");
    vi.stubEnv("LOCAL_PREVIEW_EMAIL", "admin@example.local");
    vi.stubEnv("LOCAL_PREVIEW_PASSWORD", "change-me-before-production");
    vi.stubEnv("LOCAL_PREVIEW_SESSION_TOKEN", "local-test-session-token");
    expect(authenticateLocalPreview("admin@example.local", "senha-incorreta")).toBeNull();
    expect(authenticateLocalPreview("admin@example.local", "change-me-before-production")?.token).toBe("local-test-session-token");
  });

  it("reconhece apenas o token efêmero configurado", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("LOCAL_PREVIEW_MODE", "true");
    vi.stubEnv("LOCAL_PREVIEW_SESSION_TOKEN", "local-test-session-token");
    expect(getLocalPreviewSession("token-incorreto")).toBeNull();
    expect(getLocalPreviewSession("local-test-session-token")?.localPreview).toBe(true);
  });
});
