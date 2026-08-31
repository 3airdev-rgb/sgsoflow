export type AuthorityDecision = "ALLOWED" | "DENIED" | "REQUIRES_REVIEW";

export type AuthorityEvaluation = {
  decision: AuthorityDecision;
  rationale: string;
  designationId?: string;
  regulatoryRoleCode?: string;
};

type Period = { effectiveFrom: Date; effectiveTo: Date | null };

export type AuthorityDesignation = Period & {
  id: string;
  userId: string;
  airportId: string;
  status: "DRAFT" | "ACTIVE" | "SUPERSEDED" | "REVOKED";
  regulatoryRole: { code: string; status: "ACTIVE" | "INACTIVE" | "SUSPENDED" };
  authorities: Array<Period & { code: string; status: "ACTIVE" | "INACTIVE" | "SUSPENDED" }>;
};

export function isEffective(period: Period, at: Date) {
  return period.effectiveFrom <= at && (!period.effectiveTo || period.effectiveTo >= at);
}

export function periodsOverlap(left: Period, right: Period) {
  const leftEnd = left.effectiveTo?.getTime() ?? Number.POSITIVE_INFINITY;
  const rightEnd = right.effectiveTo?.getTime() ?? Number.POSITIVE_INFINITY;
  return left.effectiveFrom.getTime() <= rightEnd && right.effectiveFrom.getTime() <= leftEnd;
}

export function evaluateRegulatoryAuthority(input: {
  userId: string;
  airportId: string;
  authorityCode: string;
  at: Date;
  designations: AuthorityDesignation[];
}): AuthorityEvaluation {
  const active = input.designations.filter((designation) =>
    designation.userId === input.userId && designation.airportId === input.airportId &&
    designation.status === "ACTIVE" && designation.regulatoryRole.status === "ACTIVE" &&
    isEffective(designation, input.at),
  );
  for (const designation of active) {
    const mapping = designation.authorities.find((authority) =>
      authority.code === input.authorityCode && authority.status === "ACTIVE" && isEffective(authority, input.at),
    );
    if (mapping) return {
      decision: "ALLOWED",
      rationale: `Usuário possui designação ${designation.regulatoryRole.code} ativa e vigente no aeródromo para a autoridade ${input.authorityCode}.`,
      designationId: designation.id,
      regulatoryRoleCode: designation.regulatoryRole.code,
    };
  }
  return {
    decision: "DENIED",
    rationale: `Nenhuma designação regulamentar ativa e vigente concede a autoridade ${input.authorityCode} neste aeródromo. Roles técnicas não concedem autoridade regulamentar.`,
  };
}

export type AccumulationDecision = "ALLOWED" | "PROHIBITED" | "NOT_REQUIRED" | "RECOMMENDATION" | "REQUIRES_REVIEW";
export type RegulatoryProfileContext = {
  operationalClass: "CLASS_I" | "CLASS_II" | "CLASS_III" | "CLASS_IV" | null;
  operatesRegularRBAC121: boolean | null;
  operatesRegularRBAC135: boolean | null;
};
export type AccumulationEvaluation = { decision: AccumulationDecision; rationale: string; sourceReference: string };
export const OPERATIONAL_ROLE_CODES = ["ACCOUNTABLE_MANAGER", "SAFETY_MANAGER", "OPERATIONS_MANAGER", "MAINTENANCE_MANAGER", "EMERGENCY_RESPONSE_MANAGER"] as const;

export function evaluateAccumulation(input: { profile: RegulatoryProfileContext; candidateRoleCode: string; existingActiveRoleCodes: string[] }): AccumulationEvaluation {
  const relevantExisting = input.existingActiveRoleCodes.filter((code) => (OPERATIONAL_ROLE_CODES as readonly string[]).includes(code));
  if (!(OPERATIONAL_ROLE_CODES as readonly string[]).includes(input.candidateRoleCode) || relevantExisting.length === 0) {
    return { decision: "ALLOWED", rationale: "Não há acumulação simultânea de responsabilidades do RBAC 153.15(a).", sourceReference: "RBAC 153.15(b)" };
  }
  const operationalClass = input.profile.operationalClass;
  if (!operationalClass) return { decision: "REQUIRES_REVIEW", rationale: "A classe operacional não está disponível no perfil vigente.", sourceReference: "RBAC 153.15(b) e Apêndice A" };
  if (operationalClass === "CLASS_I") {
    if (input.profile.operatesRegularRBAC121 === true || input.profile.operatesRegularRBAC135 === true) return { decision: "ALLOWED", rationale: "Classe I com operação RBAC 121 ou RBAC 135 regular admite livre acumulação.", sourceReference: "RBAC 153.15(b) e Apêndice A" };
    if (input.profile.operatesRegularRBAC121 === false && input.profile.operatesRegularRBAC135 === false) return { decision: "NOT_REQUIRED", rationale: "A regra de acumulação do 153.15(b) não é exigida para os demais aeródromos Classe I.", sourceReference: "RBAC 153.15(b) e Apêndice A" };
    return { decision: "REQUIRES_REVIEW", rationale: "O perfil Classe I não informa de forma conclusiva a operação RBAC 121 ou RBAC 135 regular.", sourceReference: "RBAC 153.15(b) e Apêndice A" };
  }
  const accountableSafetyPair = [input.candidateRoleCode, ...relevantExisting].includes("ACCOUNTABLE_MANAGER") && [input.candidateRoleCode, ...relevantExisting].includes("SAFETY_MANAGER");
  if (accountableSafetyPair) return { decision: "PROHIBITED", rationale: "É vedada a acumulação das responsabilidades de Gestor Responsável e responsável pelo gerenciamento da segurança operacional.", sourceReference: "RBAC 153.15(b) e Apêndice A" };
  if (operationalClass === "CLASS_IV") return { decision: "RECOMMENDATION", rationale: "Para Classe IV, recomenda-se a não acumulação das demais responsabilidades do RBAC 153.15(a); a recomendação não bloqueia a designação.", sourceReference: "RBAC 153.15(b) e Apêndice A" };
  return { decision: "ALLOWED", rationale: `A acumulação informada não está entre as vedações expressas para ${operationalClass}.`, sourceReference: "RBAC 153.15(b) e Apêndice A" };
}

export function evaluateStaffingCoverage(input: { profile: RegulatoryProfileContext; activeDesignations: Array<{ userId: string; regulatoryRoleCode: string }> }) {
  const distinctProfessionals = new Set(input.activeDesignations.filter((item) => (OPERATIONAL_ROLE_CODES as readonly string[]).includes(item.regulatoryRoleCode)).map((item) => item.userId)).size;
  if (input.profile.operationalClass === "CLASS_III" && distinctProfessionals < 3) return { decision: "RECOMMENDATION" as const, distinctProfessionals, rationale: "Recomenda-se o mínimo de três profissionais distintos para cobrir as responsabilidades do RBAC 153.15(a); a recomendação não impede designações.", sourceReference: "RBAC 153.15(b) e Apêndice A" };
  return { decision: "ALLOWED" as const, distinctProfessionals, rationale: "Nenhum alerta de quantidade mínima de profissionais se aplica.", sourceReference: "RBAC 153.15(b) e Apêndice A" };
}

export function evaluateMultiAirportAccumulation(profile: RegulatoryProfileContext): AccumulationEvaluation {
  if (!profile.operationalClass) return { decision: "REQUIRES_REVIEW", rationale: "A classe do aeródromo não está disponível.", sourceReference: "RBAC 153.15(e) e Apêndice A" };
  if (profile.operationalClass === "CLASS_I") return { decision: "ALLOWED", rationale: "Para Classe I, o Apêndice A estabelece livre acumulação entre aeródromos do mesmo operador.", sourceReference: "RBAC 153.15(e) e Apêndice A" };
  return { decision: "RECOMMENDATION", rationale: "Para Classes II, III e IV, recomenda-se não acumular responsabilidades entre aeródromos do mesmo operador; não se trata de proibição.", sourceReference: "RBAC 153.15(e) e Apêndice A" };
}

export function calculateAnacNotificationDueDate(designationDate: Date) { const due = new Date(designationDate); due.setUTCDate(due.getUTCDate() + 30); return due; }
export function evaluateDesignationNotificationApplicability(profile: RegulatoryProfileContext, roleCode: string) {
  if (!(OPERATIONAL_ROLE_CODES as readonly string[]).includes(roleCode)) return { decision: "NOT_APPLICABLE" as const, sourceReference: "RBAC 153.15(c) e (d)" };
  if (!profile.operationalClass) return { decision: "REQUIRES_REVIEW" as const, sourceReference: "RBAC 153.15(a), (c), (d) e Apêndice A" };
  if (profile.operationalClass !== "CLASS_I") return { decision: "APPLICABLE" as const, sourceReference: "RBAC 153.15(a), (c), (d) e Apêndice A" };
  if (profile.operatesRegularRBAC121 === true) return { decision: "APPLICABLE" as const, sourceReference: "RBAC 153.15(a), (c), (d) e Apêndice A" };
  if (roleCode === "ACCOUNTABLE_MANAGER" && profile.operatesRegularRBAC135 === true) return { decision: "APPLICABLE" as const, sourceReference: "RBAC 153.15(a)(1), (c), (d) e Apêndice A" };
  if (profile.operatesRegularRBAC121 === false && profile.operatesRegularRBAC135 !== null) return { decision: "NOT_APPLICABLE" as const, sourceReference: "RBAC 153.15(a), (c), (d) e Apêndice A" };
  return { decision: "REQUIRES_REVIEW" as const, sourceReference: "RBAC 153.15(a), (c), (d) e Apêndice A" };
}
export function resolveNotificationStatus(input: { status: "PENDING" | "SUBMITTED" | "OVERDUE" | "NOT_APPLICABLE"; dueDate: Date | null; notifiedAt: Date | null; at: Date }) {
  if (input.status === "NOT_APPLICABLE") return "NOT_APPLICABLE" as const;
  if (input.status === "SUBMITTED" && input.notifiedAt) return "SUBMITTED" as const;
  return input.dueDate && input.at > input.dueDate ? "OVERDUE" as const : "PENDING" as const;
}

export function evaluateSafetyCommitteeApplicability(managementRegime: "SGSO" | "PGSO" | "CRITICAL_SAFETY_ASPECTS" | "REVIEW_REQUIRED" | null) {
  if (managementRegime === "SGSO") return { decision: "REQUIRED" as const, rationale: "O regime SGSO torna aplicável a Comissão de Segurança Operacional.", sourceReference: "RBAC 153.53(c)(2)" };
  if (managementRegime === "PGSO" || managementRegime === "CRITICAL_SAFETY_ASPECTS") return { decision: "NOT_REQUIRED" as const, rationale: "A CSO de SGSO não é exigida pelo regime identificado.", sourceReference: "RBAC 153.53(c)(2) e Apêndice A" };
  return { decision: "REQUIRES_REVIEW" as const, rationale: "O regime aplicável não foi determinado de forma conclusiva.", sourceReference: "RBAC 153.53(c)(2)" };
}

function requiredCommitteeRoles(profile: RegulatoryProfileContext) {
  if (!profile.operationalClass) return null;
  if (profile.operationalClass !== "CLASS_I") return [...OPERATIONAL_ROLE_CODES];
  if (profile.operatesRegularRBAC121 === true) return [...OPERATIONAL_ROLE_CODES];
  if (profile.operatesRegularRBAC135 === true) return ["ACCOUNTABLE_MANAGER"];
  if (profile.operatesRegularRBAC121 === false && profile.operatesRegularRBAC135 === false) return [];
  return null;
}

export function evaluateSafetyCommitteeComposition(input: {
  applicability: "REQUIRED" | "NOT_REQUIRED" | "REQUIRES_REVIEW"; profile: RegulatoryProfileContext; at: Date;
  designations: Array<Period & { userId: string; status: "DRAFT" | "ACTIVE" | "SUPERSEDED" | "REVOKED"; regulatoryRoleCode: string }>;
  members: Array<Period & { userId: string; status: "ACTIVE" | "REVOKED"; memberType: "REQUIRED_MEMBER" | "ADDITIONAL_MEMBER" }>;
}) {
  if (input.applicability === "REQUIRES_REVIEW") return { decision: "REQUIRES_REVIEW" as const, rationale: "A aplicabilidade da CSO ainda requer revisão.", missingRoleCodes: [] as string[] };
  if (input.applicability === "NOT_REQUIRED") return { decision: "COMPLIANT_STRUCTURE" as const, rationale: "A CSO não é exigida para o regime avaliado.", missingRoleCodes: [] as string[] };
  const requiredRoles = requiredCommitteeRoles(input.profile);
  if (!requiredRoles) return { decision: "REQUIRES_REVIEW" as const, rationale: "Os dados do perfil não permitem determinar todas as responsabilidades aplicáveis.", missingRoleCodes: [] as string[] };
  const activeMembers = input.members.filter((member) => member.status === "ACTIVE" && isEffective(member, input.at));
  const missingRoleCodes = requiredRoles.filter((roleCode) => {
    const holders = input.designations.filter((designation) => designation.regulatoryRoleCode === roleCode && designation.status === "ACTIVE" && isEffective(designation, input.at)).map((designation) => designation.userId);
    return holders.length === 0 || !holders.some((userId) => activeMembers.some((member) => member.userId === userId && member.memberType === "REQUIRED_MEMBER"));
  });
  if (missingRoleCodes.length) return { decision: "INCOMPLETE" as const, rationale: `Faltam membros obrigatórios correspondentes às funções aplicáveis: ${missingRoleCodes.join(", ")}.`, missingRoleCodes };
  return { decision: "COMPLIANT_STRUCTURE" as const, rationale: "Todos os responsáveis regulamentares aplicáveis integram a CSO; membros adicionais são permitidos. Esta conclusão se limita à estrutura de composição.", missingRoleCodes };
}

export function hasExclusiveConflict(input: {
  multiplicity: "SINGLE" | "MULTIPLE";
  candidate: Period;
  existing: Array<Period & { status: "DRAFT" | "ACTIVE" | "SUPERSEDED" | "REVOKED" }>;
}) {
  return input.multiplicity === "SINGLE" && input.existing.some((item) => item.status === "ACTIVE" && periodsOverlap(item, input.candidate));
}

export function findActiveDesignation<T extends Period & { airportId: string; status: "DRAFT" | "ACTIVE" | "SUPERSEDED" | "REVOKED"; regulatoryRole: { code: string } }>(
  designations: T[], airportId: string, regulatoryRoleCode: string, at: Date,
) {
  return designations.find((item) => item.airportId === airportId && item.regulatoryRole.code === regulatoryRoleCode && item.status === "ACTIVE" && isEffective(item, at)) ?? null;
}
