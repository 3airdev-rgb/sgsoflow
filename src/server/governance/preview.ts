import { LOCAL_PREVIEW_AIRPORT_ID, LOCAL_PREVIEW_USER_ID } from "@/server/local-preview";

const previewDate = new Date("2026-08-29T00:00:00.000Z");

export function getLocalGovernancePreview() {
  const holder = { id: LOCAL_PREVIEW_USER_ID, name: "Responsável de demonstração", email: "preview@example.local" };
  const role = (code: string, name: string, holderMultiplicity: "SINGLE" | "MULTIPLE" = "SINGLE") => ({
    id: `preview-role-${code.toLowerCase()}`, code, name, description: "Registro visual de desenvolvimento.", sourceReference: "RBAC 153.15(a)", status: "ACTIVE" as const,
    holderMultiplicity, accumulationPolicy: "REQUIRES_REVIEW" as const, responsibilities: [], authorities: [],
  });
  const roles = [
    role("ACCOUNTABLE_MANAGER", "Gestor Responsável"), role("SAFETY_MANAGER", "Responsável pelo SGSO"),
    role("OPERATIONS_MANAGER", "Gestor de Operações"), role("MAINTENANCE_MANAGER", "Gestor de Manutenção"),
    role("EMERGENCY_RESPONSE_MANAGER", "Gestor de Resposta à Emergência"), role("CSO_MEMBER", "Membro da CSO", "MULTIPLE"),
  ];
  const designation = (code: string) => ({
    id: `preview-designation-${code.toLowerCase()}`, airportId: LOCAL_PREVIEW_AIRPORT_ID, userId: holder.id,
    regulatoryRoleId: `preview-role-${code.toLowerCase()}`, designationDate: previewDate, effectiveFrom: previewDate, effectiveTo: null,
    status: "ACTIVE" as const, designationReference: "Demonstração visual", additionalPrerogatives: null, responsibilityLimits: null, reportsToDesignationId: null,
    notificationDueDate: new Date("2026-09-28T00:00:00.000Z"), notificationStatus: "PENDING" as const, notifiedAt: null, notificationEvidence: null,
    effectiveNotificationStatus: "PENDING" as const, notes: null, createdBy: holder.id,
    createdAt: previewDate, updatedAt: previewDate, holder, regulatoryRole: roles.find((item) => item.code === code)!,
  });
  const authorities = [
    { id: "preview-authority-view", code: "VIEW_REGULATORY_STRUCTURE", name: "Visualizar estrutura regulamentar", description: "Autoridade estrutural de leitura.", status: "ACTIVE" as const },
    { id: "preview-authority-designations", code: "MANAGE_REGULATORY_DESIGNATIONS", name: "Gerenciar designações", description: "Autoridade estrutural preparatória.", status: "ACTIVE" as const },
  ];
  return {
    roles, authorities, people: [holder],
    designations: [designation("ACCOUNTABLE_MANAGER"), designation("SAFETY_MANAGER"), designation("OPERATIONS_MANAGER")],
    committees: [{
      id: "preview-committee", airportId: LOCAL_PREVIEW_AIRPORT_ID, name: "Comissão de Segurança Operacional — demonstração",
      status: "ACTIVE" as const, applicability: "REQUIRED" as const, effectiveFrom: previewDate, effectiveTo: null,
      composition: { decision: "INCOMPLETE" as const, rationale: "Demonstração: composição obrigatória incompleta.", missingRoleCodes: ["MAINTENANCE_MANAGER", "EMERGENCY_RESPONSE_MANAGER"] },
      createdBy: holder.id, createdAt: previewDate, updatedAt: previewDate,
      members: [{ id: "preview-member", safetyCommitteeId: "preview-committee", airportId: LOCAL_PREVIEW_AIRPORT_ID, userId: holder.id, roleInCommittee: "Membro", memberType: "REQUIRED_MEMBER" as const, effectiveFrom: previewDate, effectiveTo: null, status: "ACTIVE" as const, createdAt: previewDate, updatedAt: previewDate, user: holder }],
    }],
  };
}
