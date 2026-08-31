import { LOCAL_PREVIEW_AIRPORT_ID, LOCAL_PREVIEW_USER_ID } from "@/server/local-preview";

export function getLocalSafetyPolicyPreview() {
  const effectiveFrom = new Date("2026-01-01T00:00:00.000Z");
  return { policy: { id: "70000000-0000-4000-8000-000000000001", airportId: LOCAL_PREVIEW_AIRPORT_ID, versions: [{
    id: "71000000-0000-4000-8000-000000000001", version: 1, status: "ACTIVE" as const, effectiveFrom, effectiveTo: null,
    formalStatement: "A organização assume compromisso formal com a segurança operacional.", organizationCommitments: "Manter o SGSO proporcional à operação e comunicar esta política.",
    responsibilities: "A alta direção assegura a governança; cada pessoa responde pelas atribuições sob seu controle.", resourceCommitment: "Disponibilizar recursos humanos, técnicos e financeiros adequados.",
    applicableRequirementsCommitment: "Atender aos requisitos legais e regulamentares aplicáveis.", continuousImprovementCommitment: "Buscar melhoria contínua do desempenho da segurança operacional.",
    safetyReportingPrinciples: "Estimular relatos de segurança e proteger o relator, ressalvadas condutas dolosas ou manifestamente negligentes.",
    approval: { approvedAt: new Date("2025-12-15T12:00:00.000Z"), authorityCode: "APPROVE_SAFETY_POLICY", approver: { id: LOCAL_PREVIEW_USER_ID, name: "Gestor Responsável (demonstração)" } },
    reviews: [{ id: "72000000-0000-4000-8000-000000000001", reviewedAt: new Date("2026-06-30T12:00:00.000Z"), nextReviewAt: new Date("2027-06-30T00:00:00.000Z"), reason: "Revisão periódica", result: "COMPLETE" as const }],
    communications: [{ id: "73000000-0000-4000-8000-000000000001", audienceScope: "Todas as pessoas que atuam no aeródromo", communicationMethod: "Publicação interna e briefing", communicatedAt: new Date("2026-01-02T12:00:00.000Z"), evidenceReference: "PREVIEW-EVIDENCE-001" }],
    objectives: [{ id: "74000000-0000-4000-8000-000000000001", title: "Fortalecer o relato voluntário", description: "Ampliar a participação no processo de relatos.", rationale: "Aumentar a visibilidade preventiva.", intendedOutcome: "Maior participação das equipes.", measureCriterion: "Quantidade de relatos voluntários recebidos no período.", targetValue: "12", unit: "relatos/ano", status: "ACTIVE" as const, dueDate: new Date("2026-12-31T00:00:00.000Z"), owner: { id: LOCAL_PREVIEW_USER_ID, name: "Responsável pelo SGSO (demonstração)" } }],
  }] }, people: [{ id: LOCAL_PREVIEW_USER_ID, name: "Administrador Local", email: "admin@example.local" }] };
}
