export type StructuralResult = "COMPLETE" | "INCOMPLETE" | "REQUIRES_REVIEW";
export type PolicyStatus = "DRAFT" | "UNDER_REVIEW" | "APPROVED" | "ACTIVE" | "SUPERSEDED" | "ARCHIVED";
export type ObjectiveStatus = "DRAFT" | "ACTIVE" | "ACHIEVED" | "NOT_ACHIEVED" | "CANCELLED" | "SUPERSEDED";

export type PolicyContent = {
  formalStatement: string;
  organizationCommitments: string;
  responsibilities: string;
  resourceCommitment: string;
  applicableRequirementsCommitment: string;
  continuousImprovementCommitment: string;
  safetyReportingPrinciples?: string | null;
};

const requiredPolicyFields: Array<keyof PolicyContent> = [
  "formalStatement", "organizationCommitments", "responsibilities", "resourceCommitment",
  "applicableRequirementsCommitment", "continuousImprovementCommitment",
];

export function evaluatePolicyCompleteness(content: PolicyContent): { result: StructuralResult; missingFields: string[] } {
  const missingFields = requiredPolicyFields.filter((field) => !content[field]?.trim());
  return { result: missingFields.length ? "INCOMPLETE" : "COMPLETE", missingFields };
}

export function assertPolicyTransition(from: PolicyStatus, to: PolicyStatus) {
  const allowed: Record<PolicyStatus, PolicyStatus[]> = {
    DRAFT: ["UNDER_REVIEW", "ARCHIVED"], UNDER_REVIEW: ["DRAFT", "APPROVED", "ARCHIVED"],
    APPROVED: ["ACTIVE", "ARCHIVED"], ACTIVE: ["SUPERSEDED"], SUPERSEDED: ["ARCHIVED"], ARCHIVED: [],
  };
  if (!allowed[from].includes(to)) throw new Error(`Transição de política inválida: ${from} → ${to}.`);
}

export function assertPolicyContentMutable(status: PolicyStatus) {
  if (status !== "DRAFT") throw new Error("Somente versões em rascunho podem ter conteúdo alterado; crie uma nova versão.");
}

export function assertReviewDoesNotRewriteVersion(contentChanged: boolean) {
  if (contentChanged) throw new Error("Revisão com alteração de conteúdo exige uma nova versão da política.");
}

export function evaluateCommunication(input: { audienceScope: string; method: string; evidenceReference: string }): StructuralResult {
  return input.audienceScope.trim() && input.method.trim() && input.evidenceReference.trim() ? "COMPLETE" : "INCOMPLETE";
}

export function evaluateObjectiveCompleteness(input: {
  title: string; description: string; rationale: string; intendedOutcome: string; measureCriterion: string;
  ownerUserId: string; effectiveFrom: Date; dueDate: Date; targetValue?: string | null; unit?: string | null;
}): { result: StructuralResult; missingFields: string[] } {
  const missingFields: string[] = (["title", "description", "rationale", "intendedOutcome", "measureCriterion", "ownerUserId"] as const)
    .filter((field) => !input[field].trim());
  if (input.dueDate < input.effectiveFrom) missingFields.push("dueDate");
  if ((input.targetValue && !input.unit) || (!input.targetValue && input.unit)) return { result: "REQUIRES_REVIEW", missingFields };
  return { result: missingFields.length ? "INCOMPLETE" : "COMPLETE", missingFields };
}

export function assertObjectiveTransition(from: ObjectiveStatus, to: ObjectiveStatus, observedResult?: string | null) {
  const allowed: Record<ObjectiveStatus, ObjectiveStatus[]> = {
    DRAFT: ["ACTIVE", "CANCELLED"], ACTIVE: ["ACHIEVED", "NOT_ACHIEVED", "CANCELLED", "SUPERSEDED"],
    ACHIEVED: [], NOT_ACHIEVED: [], CANCELLED: [], SUPERSEDED: [],
  };
  if (!allowed[from].includes(to)) throw new Error(`Transição de objetivo inválida: ${from} → ${to}.`);
  if (["ACHIEVED", "NOT_ACHIEVED"].includes(to) && !observedResult?.trim()) throw new Error("Informe o resultado observado para concluir o objetivo.");
}

export function calculateSupersededEffectiveTo(newEffectiveFrom: Date) {
  const result = new Date(newEffectiveFrom);
  result.setUTCDate(result.getUTCDate() - 1);
  return result;
}
