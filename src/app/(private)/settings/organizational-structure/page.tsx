import { GovernanceWorkspace } from "@/components/governance-workspace";
import { getAuthorizationContext, requirePageSession } from "@/server/auth/session";
import { getLocalGovernancePreview } from "@/server/governance/preview";
import { getGovernanceWorkspace } from "@/server/governance/service";
import { isLocalPreviewSession, LOCAL_PREVIEW_AIRPORT_ID, LOCAL_PREVIEW_ORGANIZATION_ID } from "@/server/local-preview";

function serialize(data: ReturnType<typeof getLocalGovernancePreview>, organizationId: string, airportId: string, airportName: string) {
  return {
    organizationId, airportId, airportName, people: data.people,
    roles: data.roles.map((role) => ({ ...role, responsibilities: role.responsibilities, authorities: role.authorities })),
    designations: data.designations.map((item) => ({ ...item, designationDate: item.designationDate.toISOString(), notificationDueDate: item.notificationDueDate?.toISOString() ?? null, effectiveFrom: item.effectiveFrom.toISOString(), effectiveTo: null })),
    committees: data.committees.map((committee) => ({ ...committee, effectiveFrom: committee.effectiveFrom.toISOString(), effectiveTo: null, members: committee.members.map((member) => ({ ...member, effectiveFrom: member.effectiveFrom.toISOString(), effectiveTo: null })) })),
  };
}

export default async function OrganizationalStructurePage() {
  const session = await requirePageSession();
  if (isLocalPreviewSession(session)) return <GovernanceWorkspace previewMode initial={serialize(getLocalGovernancePreview(), LOCAL_PREVIEW_ORGANIZATION_ID, LOCAL_PREVIEW_AIRPORT_ID, "Aeródromo de visualização local")} />;
  if (!session.activeOrganizationId || !session.activeAirportId) return <><p className="eyebrow">Configurações</p><h1>Estrutura Organizacional</h1><div className="card"><p className="muted">Selecione uma organização e um aeródromo para visualizar a governança.</p></div></>;
  const authz = await getAuthorizationContext(session.userId);
  const data = await getGovernanceWorkspace({ authz, organizationId: session.activeOrganizationId, airportId: session.activeAirportId });
  const airportName = session.activeAirport?.name ?? "Aeródromo selecionado";
  const initial = {
    organizationId: session.activeOrganizationId, airportId: session.activeAirportId, airportName, people: data.people,
    roles: data.roles.map((role) => ({ ...role, responsibilities: role.responsibilities, authorities: role.authorities })),
    designations: data.designations.map((item) => ({ ...item, designationDate: item.designationDate.toISOString(), notificationDueDate: item.notificationDueDate?.toISOString() ?? null, notifiedAt: item.notifiedAt?.toISOString() ?? null, effectiveFrom: item.effectiveFrom.toISOString(), effectiveTo: item.effectiveTo?.toISOString() ?? null })),
    committees: data.committees.map((committee) => ({ ...committee, effectiveFrom: committee.effectiveFrom.toISOString(), effectiveTo: committee.effectiveTo?.toISOString() ?? null, members: committee.members.map((member) => ({ ...member, effectiveFrom: member.effectiveFrom.toISOString(), effectiveTo: member.effectiveTo?.toISOString() ?? null })) })),
  };
  return <GovernanceWorkspace initial={initial} />;
}
