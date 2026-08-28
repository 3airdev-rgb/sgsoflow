import { z } from "zod";

export const REGULATORY_ENGINE_VERSION = "1.0.0";

export const profileFieldSchema = z.enum([
  "aerodromeUse",
  "operationalClass",
  "hasOperationalCertificate",
  "isMilitarySharedAerodrome",
  "operatesRegularRBAC121",
  "operatesRegularRBAC135",
  "hasSGSO",
  "hasPGSO",
]);

const comparableValueSchema = z.union([z.string(), z.boolean(), z.number()]);
const predicateSchema = z.object({
  field: profileFieldSchema,
  operator: z.literal("EQ"),
  value: comparableValueSchema,
}).strict();

export type SafeCondition =
  | z.infer<typeof predicateSchema>
  | { all: SafeCondition[] }
  | { any: SafeCondition[] }
  | { not: SafeCondition };

export const conditionSchema: z.ZodType<SafeCondition> = z.lazy(() =>
  z.union([
    predicateSchema,
    z.object({ all: z.array(conditionSchema).min(1) }).strict(),
    z.object({ any: z.array(conditionSchema).min(1) }).strict(),
    z.object({ not: conditionSchema }).strict(),
  ]),
);

export type RegulatoryProfileSnapshot = {
  id: string;
  airportId: string;
  version: number;
  aerodromeUse: "PUBLIC" | "PRIVATE" | null;
  operationalClass: "CLASS_I" | "CLASS_II" | "CLASS_III" | "CLASS_IV" | null;
  hasOperationalCertificate: boolean | null;
  isMilitarySharedAerodrome: boolean | null;
  operatesRegularRBAC121: boolean | null;
  operatesRegularRBAC135: boolean | null;
  hasSGSO: boolean | null;
  hasPGSO: boolean | null;
};

export type EngineRule = {
  id: string;
  version: number;
  conditions: unknown;
  resultWhenMatched: "APPLICABLE" | "NOT_APPLICABLE" | "CONDITIONAL" | "REVIEW_REQUIRED";
  managementRegime: "SGSO" | "PGSO" | "CRITICAL_SAFETY_ASPECTS" | "REVIEW_REQUIRED" | null;
  rationaleTemplate: string;
  requirement: { id: string; section: string; title: string };
};

type TriState = "MATCH" | "NO_MATCH" | "UNKNOWN";

function evaluateCondition(condition: SafeCondition, profile: RegulatoryProfileSnapshot): TriState {
  if ("field" in condition) {
    const actual = profile[condition.field];
    if (actual === null || actual === undefined) return "UNKNOWN";
    return actual === condition.value ? "MATCH" : "NO_MATCH";
  }
  if ("all" in condition) {
    const results = condition.all.map((item) => evaluateCondition(item, profile));
    if (results.includes("NO_MATCH")) return "NO_MATCH";
    return results.includes("UNKNOWN") ? "UNKNOWN" : "MATCH";
  }
  if ("any" in condition) {
    const results = condition.any.map((item) => evaluateCondition(item, profile));
    if (results.includes("MATCH")) return "MATCH";
    return results.includes("UNKNOWN") ? "UNKNOWN" : "NO_MATCH";
  }
  const result = evaluateCondition(condition.not, profile);
  return result === "UNKNOWN" ? result : result === "MATCH" ? "NO_MATCH" : "MATCH";
}

function relevantAttributes(condition: SafeCondition, profile: RegulatoryProfileSnapshot) {
  const fields = new Set<z.infer<typeof profileFieldSchema>>();
  const visit = (item: SafeCondition) => {
    if ("field" in item) fields.add(item.field);
    else if ("all" in item) item.all.forEach(visit);
    else if ("any" in item) item.any.forEach(visit);
    else visit(item.not);
  };
  visit(condition);
  return Object.fromEntries([...fields].map((field) => [field, profile[field]]));
}

export type AssessmentItemResult = {
  regulatoryRequirementId: string;
  requirementSection: string;
  requirementTitle: string;
  applicabilityRuleId: string;
  ruleVersion: number;
  applicabilityStatus: "APPLICABLE" | "NOT_APPLICABLE" | "CONDITIONAL" | "REVIEW_REQUIRED";
  rationale: string;
  evaluationMetadata: { profileVersion: number; attributes: Record<string, unknown>; conditionResult: TriState | "INVALID" };
  managementRegime: EngineRule["managementRegime"];
};

export type EngineAssessment = {
  engineVersion: string;
  managementRegime: "SGSO" | "PGSO" | "CRITICAL_SAFETY_ASPECTS" | "REVIEW_REQUIRED";
  overallResult: AssessmentItemResult["applicabilityStatus"];
  rationale: string;
  items: AssessmentItemResult[];
};

const profileFieldLabels: Record<z.infer<typeof profileFieldSchema>, string> = {
  aerodromeUse: "tipo de uso do aeródromo",
  operationalClass: "classe operacional",
  hasOperationalCertificate: "certificação operacional RBAC 139",
  isMilitarySharedAerodrome: "condição de aeródromo compartilhado/militar",
  operatesRegularRBAC121: "operação regular RBAC 121",
  operatesRegularRBAC135: "operação regular RBAC 135",
  hasSGSO: "SGSO atualmente existente",
  hasPGSO: "PGSO atualmente existente",
};

function assessmentRationale(profile: RegulatoryProfileSnapshot, managementRegime: EngineAssessment["managementRegime"], regimes: string[], items: AssessmentItemResult[]) {
  if (profile.aerodromeUse === "PRIVATE") {
    return "Os requisitos avaliados da Subparte C não são exigidos para aeródromo de uso privativo segundo o Apêndice A do RBAC 153 EMD 11.";
  }
  if (profile.isMilitarySharedAerodrome === true) {
    return "Revisão necessária: o perfil informa aeródromo compartilhado/militar; é preciso verificar as condições cumulativas da exceção prevista no RBAC 153.5(a)(2).";
  }
  if (managementRegime === "SGSO") {
    return "SGSO aplicável porque o aeródromo é de uso público e detentor de Certificado Operacional de Aeroporto conforme o RBAC 139.";
  }
  if (managementRegime === "PGSO") {
    return "PGSO aplicável porque o aeródromo é de uso público, não possui SGSO e opera RBAC 121 ou RBAC 135 regular.";
  }
  if (managementRegime === "CRITICAL_SAFETY_ASPECTS") {
    return "Gerenciamento de aspectos críticos aplicável porque o aeródromo é de uso público, não possui SGSO nem PGSO e não opera RBAC 121 ou RBAC 135 regular.";
  }
  if (regimes.length > 1) return "Revisão necessária: regras vigentes produziram regimes normativos conflitantes.";
  const missingFields = new Set<string>();
  for (const item of items) {
    if (item.applicabilityStatus !== "REVIEW_REQUIRED") continue;
    for (const [field, value] of Object.entries(item.evaluationMetadata.attributes)) {
      if (value === null || value === undefined) missingFields.add(profileFieldLabels[field as keyof typeof profileFieldLabels] ?? field);
    }
  }
  return missingFields.size > 0
    ? `Revisão necessária porque faltam dados sobre: ${[...missingFields].join(", ")}.`
    : "Revisão necessária: os dados ou as regras vigentes não permitem identificar um único regime normativamente exigido.";
}

export function evaluateRegulatoryApplicability(profile: RegulatoryProfileSnapshot, rules: EngineRule[]): EngineAssessment {
  const items = rules.map<AssessmentItemResult>((rule) => {
    const parsed = conditionSchema.safeParse(rule.conditions);
    if (!parsed.success) {
      return {
        regulatoryRequirementId: rule.requirement.id,
        requirementSection: rule.requirement.section,
        requirementTitle: rule.requirement.title,
        applicabilityRuleId: rule.id,
        ruleVersion: rule.version,
        applicabilityStatus: "REVIEW_REQUIRED",
        rationale: `A regra ${rule.id} não possui condições válidas para avaliação automática.`,
        evaluationMetadata: { profileVersion: profile.version, attributes: {}, conditionResult: "INVALID" },
        managementRegime: "REVIEW_REQUIRED",
      };
    }
    const conditionResult = evaluateCondition(parsed.data, profile);
    const attributes = relevantAttributes(parsed.data, profile);
    const status = conditionResult === "UNKNOWN"
      ? "REVIEW_REQUIRED"
      : conditionResult === "MATCH"
        ? rule.resultWhenMatched
        : "NOT_APPLICABLE";
    const rationale = conditionResult === "MATCH"
      ? rule.rationaleTemplate
      : conditionResult === "UNKNOWN"
        ? `O requisito ${rule.requirement.section} exige revisão porque o perfil não contém todos os atributos usados pela regra v${rule.version}.`
        : `O requisito ${rule.requirement.section} não é aplicável porque o perfil não satisfaz as condições da regra v${rule.version}.`;
    return {
      regulatoryRequirementId: rule.requirement.id,
      requirementSection: rule.requirement.section,
      requirementTitle: rule.requirement.title,
      applicabilityRuleId: rule.id,
      ruleVersion: rule.version,
      applicabilityStatus: status,
      rationale,
      evaluationMetadata: { profileVersion: profile.version, attributes, conditionResult },
      managementRegime: status === "APPLICABLE" ? rule.managementRegime : null,
    };
  });

  const regimes = [...new Set(items.flatMap((item) =>
    item.managementRegime && item.managementRegime !== "REVIEW_REQUIRED" ? [item.managementRegime] : [],
  ))];
  const requiresReview = items.some((item) => item.applicabilityStatus === "REVIEW_REQUIRED");
  const managementRegime = !requiresReview && regimes.length === 1 ? regimes[0] : "REVIEW_REQUIRED";
  const privateAerodrome = profile.aerodromeUse === "PRIVATE" && items.every((item) => item.applicabilityStatus === "NOT_APPLICABLE");
  const overallResult = privateAerodrome
    ? "NOT_APPLICABLE"
    : managementRegime === "REVIEW_REQUIRED"
      ? "REVIEW_REQUIRED"
    : items.some((item) => item.applicabilityStatus === "CONDITIONAL")
      ? "CONDITIONAL"
      : "APPLICABLE";
  const rationale = assessmentRationale(profile, managementRegime, regimes, items);

  return { engineVersion: REGULATORY_ENGINE_VERSION, managementRegime, overallResult, rationale, items };
}
