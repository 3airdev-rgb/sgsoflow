import { describe, expect, it } from "vitest";
import { evaluateRegulatoryApplicability, REGULATORY_ENGINE_VERSION, type EngineRule, type RegulatoryProfileSnapshot } from "@/server/regulatory/engine";
import { nextProfileVersion, planProfileActivation, rejectCompletedAssessmentMutation, type VersionedProfile } from "@/server/regulatory/profile-versioning";

const baseProfile: RegulatoryProfileSnapshot = {
  id: "profile-1", airportId: "airport-1", version: 1, aerodromeUse: "PUBLIC", operationalClass: "CLASS_II",
  hasOperationalCertificate: false, operatesRegularRBAC121: false, operatesRegularRBAC135: false, hasSGSO: false, hasPGSO: false,
  isMilitarySharedAerodrome: false,
};
const predicate = (field: keyof RegulatoryProfileSnapshot, value: string | boolean | number) => ({ field, operator: "EQ", value });
const rule = (id: string, section: string, regime: EngineRule["managementRegime"], conditions: unknown, version = 1): EngineRule => ({
  id, version, conditions, resultWhenMatched: "APPLICABLE", managementRegime: regime,
  rationaleTemplate: `O perfil satisfaz a regra do requisito ${section}.`,
  requirement: { id: `requirement-${id}`, section, title: `Requisito ${section}` },
});
const regimeRules = [
  rule("sgso", "153.51", "SGSO", { all: [predicate("aerodromeUse", "PUBLIC"), predicate("isMilitarySharedAerodrome", false), predicate("hasOperationalCertificate", true)] }),
  rule("pgso", "153.63", "PGSO", { all: [
    predicate("aerodromeUse", "PUBLIC"), predicate("isMilitarySharedAerodrome", false), predicate("hasOperationalCertificate", false), predicate("hasSGSO", false),
    { any: [predicate("operatesRegularRBAC121", true), predicate("operatesRegularRBAC135", true)] },
  ] }),
  rule("critical", "153.73", "CRITICAL_SAFETY_ASPECTS", { all: [
    predicate("aerodromeUse", "PUBLIC"), predicate("isMilitarySharedAerodrome", false), predicate("hasOperationalCertificate", false),
    predicate("hasSGSO", false), predicate("hasPGSO", false), predicate("operatesRegularRBAC121", false), predicate("operatesRegularRBAC135", false),
  ] }),
];

describe("Regulatory Applicability Engine", () => {
  it("T01 — determina SGSO para aeródromo público certificado", () => {
    const profile = { ...baseProfile, hasOperationalCertificate: true };
    const result = evaluateRegulatoryApplicability(profile, [rule("sgso", "153.51", "SGSO", { all: [predicate("aerodromeUse", "PUBLIC"), predicate("hasOperationalCertificate", true)] })]);
    expect(result.managementRegime).toBe("SGSO");
  });

  it("T02 — determina PGSO para operação regular sem certificado e sem SGSO", () => {
    const profile = { ...baseProfile, operatesRegularRBAC135: true };
    const conditions = { all: [predicate("aerodromeUse", "PUBLIC"), predicate("hasOperationalCertificate", false), predicate("hasSGSO", false), { any: [predicate("operatesRegularRBAC121", true), predicate("operatesRegularRBAC135", true)] }] };
    expect(evaluateRegulatoryApplicability(profile, [rule("pgso", "153.63", "PGSO", conditions)]).managementRegime).toBe("PGSO");
  });

  it("T03 — determina gerenciamento de aspectos críticos quando não há SGSO ou PGSO", () => {
    const conditions = { all: [predicate("aerodromeUse", "PUBLIC"), predicate("hasOperationalCertificate", false), predicate("hasSGSO", false), predicate("hasPGSO", false), predicate("operatesRegularRBAC121", false), predicate("operatesRegularRBAC135", false)] };
    expect(evaluateRegulatoryApplicability(baseProfile, [rule("critical", "153.73", "CRITICAL_SAFETY_ASPECTS", conditions)]).managementRegime).toBe("CRITICAL_SAFETY_ASPECTS");
  });

  it("T04 — dados insuficientes produzem REVIEW_REQUIRED", () => {
    const profile = { ...baseProfile, hasOperationalCertificate: null };
    const result = evaluateRegulatoryApplicability(profile, [rule("sgso", "153.51", "SGSO", { all: [predicate("aerodromeUse", "PUBLIC"), predicate("hasOperationalCertificate", true)] })]);
    expect(result).toMatchObject({ managementRegime: "REVIEW_REQUIRED", overallResult: "REVIEW_REQUIRED" });
  });

  it("T05 — requisito aplicável retorna justificativa explicável", () => {
    const result = evaluateRegulatoryApplicability({ ...baseProfile, hasOperationalCertificate: true }, [rule("sgso", "153.51", "SGSO", predicate("hasOperationalCertificate", true))]);
    expect(result.items[0]).toMatchObject({ applicabilityStatus: "APPLICABLE", rationale: expect.stringContaining("153.51") });
    expect(result.items[0].evaluationMetadata.attributes).toEqual({ hasOperationalCertificate: true });
  });

  it("T06 — requisito não aplicável retorna justificativa", () => {
    const result = evaluateRegulatoryApplicability(baseProfile, [rule("sgso", "153.51", "SGSO", predicate("hasOperationalCertificate", true))]);
    expect(result.items[0]).toMatchObject({ applicabilityStatus: "NOT_APPLICABLE", rationale: expect.stringContaining("não satisfaz") });
  });

  it("T09 — regra nova não altera o snapshot da avaliação histórica", () => {
    const rules = [rule("critical", "153.73", "CRITICAL_SAFETY_ASPECTS", predicate("hasOperationalCertificate", false), 1)];
    const historical = evaluateRegulatoryApplicability(baseProfile, rules);
    rules[0] = rule("critical-v2", "153.73", "REVIEW_REQUIRED", predicate("hasOperationalCertificate", true), 2);
    expect(historical.items[0]).toMatchObject({ applicabilityRuleId: "critical", ruleVersion: 1, applicabilityStatus: "APPLICABLE" });
  });

  it("T10 — assessment informa versão explícita do motor", () => {
    const result = evaluateRegulatoryApplicability(baseProfile, [rule("critical", "153.73", "CRITICAL_SAFETY_ASPECTS", predicate("hasOperationalCertificate", false))]);
    expect(result.engineVersion).toBe(REGULATORY_ENGINE_VERSION);
  });

  it("T11 — item do assessment preserva versão da regra", () => {
    const result = evaluateRegulatoryApplicability(baseProfile, [rule("critical", "153.73", "CRITICAL_SAFETY_ASPECTS", predicate("hasOperationalCertificate", false), 7)]);
    expect(result.items[0].ruleVersion).toBe(7);
  });

  it("rejeita formato de condição não permitido sem executar código", () => {
    const result = evaluateRegulatoryApplicability(baseProfile, [rule("unsafe", "153.51", "SGSO", { script: "return true" })]);
    expect(result.items[0]).toMatchObject({ applicabilityStatus: "REVIEW_REQUIRED", evaluationMetadata: { conditionResult: "INVALID" } });
  });

  it("encaminha aeródromo compartilhado/militar para revisão humana", () => {
    const profile = { ...baseProfile, isMilitarySharedAerodrome: true, hasOperationalCertificate: true };
    const conditions = { all: [predicate("isMilitarySharedAerodrome", false), predicate("hasOperationalCertificate", true)] };
    expect(evaluateRegulatoryApplicability(profile, [rule("sgso", "153.51", "SGSO", conditions)]).managementRegime).toBe("REVIEW_REQUIRED");
  });
});

describe("auditoria normativa de precedência A–G", () => {
  it("cenário A — certificado + RBAC 121 resulta SGSO, não PGSO", () => {
    const result = evaluateRegulatoryApplicability({ ...baseProfile, hasOperationalCertificate: true, operatesRegularRBAC121: true }, regimeRules);
    expect(result).toMatchObject({ managementRegime: "SGSO", rationale: expect.stringContaining("detentor de Certificado Operacional") });
    expect(result.items.find((item) => item.requirementSection === "153.63")?.applicabilityStatus).toBe("NOT_APPLICABLE");
  });

  it("cenário B — certificado + RBAC 135 regular resulta SGSO, não PGSO", () => {
    const result = evaluateRegulatoryApplicability({ ...baseProfile, hasOperationalCertificate: true, operatesRegularRBAC135: true }, regimeRules);
    expect(result).toMatchObject({ managementRegime: "SGSO", rationale: expect.stringContaining("RBAC 139") });
    expect(result.items.find((item) => item.requirementSection === "153.63")?.applicabilityStatus).toBe("NOT_APPLICABLE");
  });

  it("cenário C — certificado + RBAC 121 + RBAC 135 regular resulta SGSO", () => {
    const result = evaluateRegulatoryApplicability({ ...baseProfile, hasOperationalCertificate: true, operatesRegularRBAC121: true, operatesRegularRBAC135: true }, regimeRules);
    expect(result).toMatchObject({ managementRegime: "SGSO", rationale: expect.stringContaining("aeródromo é de uso público") });
  });

  it("cenário D — sem certificado + RBAC 121 resulta PGSO", () => {
    const result = evaluateRegulatoryApplicability({ ...baseProfile, operatesRegularRBAC121: true }, regimeRules);
    expect(result).toMatchObject({ managementRegime: "PGSO", rationale: expect.stringContaining("opera RBAC 121 ou RBAC 135 regular") });
  });

  it("cenário E — sem certificado + RBAC 135 regular resulta PGSO", () => {
    const result = evaluateRegulatoryApplicability({ ...baseProfile, operatesRegularRBAC135: true }, regimeRules);
    expect(result).toMatchObject({ managementRegime: "PGSO", rationale: expect.stringContaining("não possui SGSO") });
  });

  it("cenário F — sem SGSO/PGSO e sem operação regular resulta aspectos críticos", () => {
    const result = evaluateRegulatoryApplicability(baseProfile, regimeRules);
    expect(result).toMatchObject({ managementRegime: "CRITICAL_SAFETY_ASPECTS", rationale: expect.stringContaining("não possui SGSO nem PGSO") });
  });

  it("cenário G — certificação insuficiente resulta REVIEW_REQUIRED com causa", () => {
    const result = evaluateRegulatoryApplicability({ ...baseProfile, hasOperationalCertificate: null }, regimeRules);
    expect(result).toMatchObject({ managementRegime: "REVIEW_REQUIRED", rationale: expect.stringContaining("certificação operacional RBAC 139") });
  });

  it("aeródromo de uso privativo não recebe SGSO, PGSO ou 153.73", () => {
    const result = evaluateRegulatoryApplicability({ ...baseProfile, aerodromeUse: "PRIVATE", hasOperationalCertificate: true, operatesRegularRBAC121: true }, regimeRules);
    expect(result.overallResult).toBe("NOT_APPLICABLE");
    expect(result.rationale).toContain("não são exigidos para aeródromo de uso privativo");
    expect(result.items.every((item) => item.applicabilityStatus === "NOT_APPLICABLE")).toBe(true);
  });

  it("regime exigido não é inferido apenas do SGSO/PGSO declarado", () => {
    const result = evaluateRegulatoryApplicability({ ...baseProfile, hasOperationalCertificate: true, operatesRegularRBAC135: true, hasPGSO: true }, regimeRules);
    expect(result.managementRegime).toBe("SGSO");
  });
});

describe("versionamento e imutabilidade", () => {
  const profiles: VersionedProfile[] = [{ id: "v1", airportId: "airport-1", version: 1, status: "ACTIVE", effectiveFrom: new Date("2026-01-01"), effectiveTo: null }];

  it("T07 — mudança de perfil recebe nova versão", () => expect(nextProfileVersion(profiles)).toBe(2));

  it("T08 — planejar ativação não altera a versão anterior", () => {
    const before = structuredClone(profiles);
    const plan = planProfileActivation([...profiles, { id: "v2", airportId: "airport-1", version: 2, status: "DRAFT", effectiveFrom: new Date("2026-08-01"), effectiveTo: null }], "v2", new Date("2026-08-01"));
    expect(plan.superseded[0]).toMatchObject({ id: "v1", status: "SUPERSEDED" });
    expect(profiles).toEqual(before);
  });

  it("T16 — alteração de assessment concluído é rejeitada", () => expect(() => rejectCompletedAssessmentMutation()).toThrow(/imutáveis/));
});
