import { describe, expect, it } from "vitest";
import { requireAirportAccess, type AuthorizationContext } from "@/server/authorization/policies";
import { evaluateRegulatoryAuthority, type AuthorityDesignation } from "@/server/governance/domain";
import { assertPolicyContentMutable, assertPolicyTransition, assertReviewDoesNotRewriteVersion, calculateSupersededEffectiveTo, evaluateCommunication, evaluateObjectiveCompleteness } from "@/server/safety-policy/domain";

const at = new Date("2026-08-31T12:00:00Z");
const authz: AuthorizationContext = { userId: "admin", organizations: [{ organizationId: "org-a", role: "AIRPORT_ADMIN", airports: [{ organizationId: "org-a", airportId: "airport-a", role: "AIRPORT_ADMIN" }] }] };
const accountableDesignation: AuthorityDesignation = { id: "designation-am", userId: "manager", airportId: "airport-a", status: "ACTIVE", effectiveFrom: new Date("2026-01-01"), effectiveTo: null, regulatoryRole: { code: "ACCOUNTABLE_MANAGER", status: "ACTIVE" }, authorities: [{ code: "APPROVE_SAFETY_POLICY", status: "ACTIVE", effectiveFrom: new Date("2026-01-01"), effectiveTo: null }] };

describe("Etapa 04 — política e objetivos", () => {
  it("POL-01 — usuário sem autoridade não aprova Política", () => expect(evaluateRegulatoryAuthority({ userId: "user", airportId: "airport-a", authorityCode: "APPROVE_SAFETY_POLICY", at, designations: [] }).decision).toBe("DENIED"));
  it("POL-02 — SYSTEM_ADMIN sem designação regulamentar não aprova Política", () => expect(evaluateRegulatoryAuthority({ userId: "system-admin", airportId: "airport-a", authorityCode: "APPROVE_SAFETY_POLICY", at, designations: [] }).decision).toBe("DENIED"));
  it("POL-03 — Gestor Responsável vigente com autoridade configurada pode aprovar", () => expect(evaluateRegulatoryAuthority({ userId: "manager", airportId: "airport-a", authorityCode: "APPROVE_SAFETY_POLICY", at, designations: [accountableDesignation] })).toMatchObject({ decision: "ALLOWED", designationId: "designation-am", regulatoryRoleCode: "ACCOUNTABLE_MANAGER" }));
  it("POL-04 — designação expirada não permite aprovação", () => expect(evaluateRegulatoryAuthority({ userId: "manager", airportId: "airport-a", authorityCode: "APPROVE_SAFETY_POLICY", at, designations: [{ ...accountableDesignation, effectiveTo: new Date("2026-08-30") }] }).decision).toBe("DENIED"));
  it("POL-06 — apenas uma Política ACTIVE é admitida no workflow por Airport", () => { expect(() => assertPolicyTransition("APPROVED", "ACTIVE")).not.toThrow(); expect(() => assertPolicyTransition("ACTIVE", "ACTIVE")).toThrow(); });
  it("POL-07 — nova versão preserva histórico em vez de reabrir versão ativa", () => { expect(() => assertPolicyContentMutable("ACTIVE")).toThrow(/nova versão/); expect(() => assertPolicyTransition("ACTIVE", "SUPERSEDED")).not.toThrow(); });
  it("POL-08 — Política ACTIVE não pode ser editada silenciosamente", () => expect(() => assertPolicyContentMutable("ACTIVE")).toThrow(/nova versão/));
  it("POL-09 — supersession preserva a versão anterior e encerra sua vigência", () => expect(calculateSupersededEffectiveTo(new Date("2026-08-31T00:00:00Z")).toISOString()).toContain("2026-08-30"));
  it("POL-10 — cross-tenant policyId é bloqueado antes da consulta", () => expect(() => requireAirportAccess(authz, "org-b", "airport-a", "policy:manage")).toThrow());
  it("POL-11 — cross-tenant objectiveId é bloqueado pelo escopo do aeródromo", () => expect(() => requireAirportAccess(authz, "org-a", "airport-b", "policy:manage")).toThrow());
  it("POL-12 — objetivo deve estar associado ao Airport autorizado", () => { expect(() => requireAirportAccess(authz, "org-a", "airport-a", "policy:manage")).not.toThrow(); expect(() => requireAirportAccess(authz, "org-a", "airport-foreign", "policy:manage")).toThrow(); });
  it("POL-13 — objetivo possui responsável, critério e prazo", () => expect(evaluateObjectiveCompleteness({ title: "Objetivo", description: "Descrição", rationale: "Razão", intendedOutcome: "Resultado", measureCriterion: "Critério", ownerUserId: "user", effectiveFrom: new Date("2026-01-01"), dueDate: new Date("2026-12-31"), targetValue: "12", unit: "relatos" }).result).toBe("COMPLETE"));
  it("POL-14 — alteração de conteúdo aprovado exige nova versão", () => expect(() => assertReviewDoesNotRewriteVersion(true)).toThrow(/nova versão/));
  it("POL-15 — comunicação só é registrada estruturalmente com evidência", () => { expect(evaluateCommunication({ audienceScope: "Todos", method: "Briefing", evidenceReference: "ATA-1" })).toBe("COMPLETE"); expect(evaluateCommunication({ audienceScope: "Todos", method: "Briefing", evidenceReference: "" })).toBe("INCOMPLETE"); });
  it("POL-22 — Authority Service separa role técnica de autoridade regulamentar", () => { const technicalRoleOnly = [{ ...accountableDesignation, userId: "airport-admin", authorities: [] }]; expect(evaluateRegulatoryAuthority({ userId: "airport-admin", airportId: "airport-a", authorityCode: "APPROVE_SAFETY_POLICY", at, designations: technicalRoleOnly }).decision).toBe("DENIED"); });
});
