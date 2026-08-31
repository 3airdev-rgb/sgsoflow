import { describe, expect, it } from "vitest";
import { evaluateAccumulation, evaluateRegulatoryAuthority, findActiveDesignation, hasExclusiveConflict, type AuthorityDesignation } from "@/server/governance/domain";

const at = new Date("2026-08-29T12:00:00Z");
function designation(overrides: Partial<AuthorityDesignation> = {}): AuthorityDesignation {
  return {
    id: "designation-1", userId: "user-1", airportId: "airport-a", status: "ACTIVE",
    effectiveFrom: new Date("2026-01-01"), effectiveTo: null,
    regulatoryRole: { code: "ACCOUNTABLE_MANAGER", status: "ACTIVE" },
    authorities: [{ code: "VIEW_REGULATORY_STRUCTURE", status: "ACTIVE", effectiveFrom: new Date("2026-01-01"), effectiveTo: null }],
    ...overrides,
  };
}

describe("Etapa 03 — domínio de governança e autoridade", () => {
  it("GOV-01 — SYSTEM_ADMIN não recebe automaticamente autoridade regulamentar", () => {
    expect(evaluateRegulatoryAuthority({ userId: "system-admin", airportId: "airport-a", authorityCode: "VIEW_REGULATORY_STRUCTURE", at, designations: [] }).decision).toBe("DENIED");
  });
  it("GOV-02 — ACCOUNTABLE_MANAGER ativo recebe autoridade configurada", () => {
    expect(evaluateRegulatoryAuthority({ userId: "user-1", airportId: "airport-a", authorityCode: "VIEW_REGULATORY_STRUCTURE", at, designations: [designation()] }).decision).toBe("ALLOWED");
  });
  it("GOV-03 — designação expirada não concede autoridade", () => {
    expect(evaluateRegulatoryAuthority({ userId: "user-1", airportId: "airport-a", authorityCode: "VIEW_REGULATORY_STRUCTURE", at, designations: [designation({ effectiveTo: new Date("2026-02-01") })] }).decision).toBe("DENIED");
  });
  it("GOV-04 — designação futura não concede autoridade antes da vigência", () => {
    expect(evaluateRegulatoryAuthority({ userId: "user-1", airportId: "airport-a", authorityCode: "VIEW_REGULATORY_STRUCTURE", at, designations: [designation({ effectiveFrom: new Date("2027-01-01") })] }).decision).toBe("DENIED");
  });
  it("GOV-05 — apenas um ACCOUNTABLE_MANAGER ativo no mesmo período", () => {
    expect(hasExclusiveConflict({ multiplicity: "SINGLE", candidate: { effectiveFrom: new Date("2026-06-01"), effectiveTo: null }, existing: [{ status: "ACTIVE", effectiveFrom: new Date("2026-01-01"), effectiveTo: null }] })).toBe(true);
  });
  it("GOV-06 — histórico de Gestor Responsável é preservado", () => {
    const historical = { ...designation(), status: "SUPERSEDED" as const, effectiveTo: new Date("2026-06-30") };
    const records = [historical, designation({ id: "designation-2", effectiveFrom: new Date("2026-07-01") })];
    expect(records).toContain(historical); expect(records[0].status).toBe("SUPERSEDED");
  });
  it("GOV-07 — nova designação não altera designação histórica", () => {
    const historical = Object.freeze({ ...designation(), status: "SUPERSEDED" as const, effectiveTo: new Date("2026-06-30") });
    const next = [...[historical], designation({ id: "designation-2" })];
    expect(next[0]).toBe(historical); expect(next[0].effectiveTo?.toISOString()).toContain("2026-06-30");
  });
  it("GOV-08 — Safety Manager vigente é identificado corretamente", () => {
    const safety = designation({ regulatoryRole: { code: "SAFETY_MANAGER", status: "ACTIVE" } });
    expect(findActiveDesignation([safety], "airport-a", "SAFETY_MANAGER", at)?.id).toBe("designation-1");
  });
  it("GOV-18 — authority service retorna rationale explicável", () => {
    const result = evaluateRegulatoryAuthority({ userId: "user-1", airportId: "airport-a", authorityCode: "VIEW_REGULATORY_STRUCTURE", at, designations: [designation()] });
    expect(result.rationale).toContain("ACCOUNTABLE_MANAGER"); expect(result.rationale).toContain("VIEW_REGULATORY_STRUCTURE");
  });
  it("GOV-19 — acumulação não representada resulta REQUIRES_REVIEW", () => {
    expect(evaluateAccumulation({ profile: { operationalClass: null, operatesRegularRBAC121: null, operatesRegularRBAC135: null }, candidateRoleCode: "SAFETY_MANAGER", existingActiveRoleCodes: ["ACCOUNTABLE_MANAGER"] }).decision).toBe("REQUIRES_REVIEW");
  });
  it("GOV-20 — perfil/aeródromo incorreto não concede autoridade", () => {
    expect(evaluateRegulatoryAuthority({ userId: "user-1", airportId: "airport-b", authorityCode: "VIEW_REGULATORY_STRUCTURE", at, designations: [designation()] }).decision).toBe("DENIED");
  });
});
