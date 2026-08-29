import { requirePageSession, getAuthorizationContext } from "@/server/auth/session";
import { getRegulatoryWorkspace } from "@/server/regulatory/service";
import { RegulatoryProfileWorkspace } from "@/components/regulatory-profile-workspace";
import { isLocalPreviewSession, LOCAL_PREVIEW_AIRPORT_ID, LOCAL_PREVIEW_ORGANIZATION_ID } from "@/server/local-preview";

export default async function RegulatoryProfilePage() {
  const session = await requirePageSession();
  if (isLocalPreviewSession(session)) {
    return <RegulatoryProfileWorkspace previewMode initial={{ airport: { id: LOCAL_PREVIEW_AIRPORT_ID, name: "Aeródromo de visualização local", organizationId: LOCAL_PREVIEW_ORGANIZATION_ID }, profiles: [], assessments: [] }} />;
  }
  if (!session.activeOrganizationId || !session.activeAirportId) {
    return <><p className="eyebrow">Configurações</p><h1>Perfil Regulatório</h1><div className="card"><p className="muted">Selecione uma organização e um aeródromo no cabeçalho para acessar o perfil regulatório.</p></div></>;
  }
  const authz = await getAuthorizationContext(session.userId);
  const data = await getRegulatoryWorkspace({ authz, organizationId: session.activeOrganizationId, airportId: session.activeAirportId });
  const workspace = {
    airport: { id: data.airport.id, name: data.airport.name, organizationId: data.airport.organizationId },
    profiles: data.profiles.map((profile) => ({ ...profile, effectiveFrom: profile.effectiveFrom.toISOString(), effectiveTo: profile.effectiveTo?.toISOString() ?? null, createdAt: profile.createdAt.toISOString(), updatedAt: profile.updatedAt.toISOString() })),
    assessments: data.assessments.map((assessment) => ({
      id: assessment.id, evaluatedAt: assessment.evaluatedAt.toISOString(), engineVersion: assessment.engineVersion,
      managementRegime: assessment.managementRegime, overallResult: assessment.overallResult, rationale: assessment.rationale,
      profileVersion: assessment.regulatoryProfile.version,
      items: assessment.items.map((item) => ({ id: item.id, section: item.regulatoryRequirement.section, title: item.regulatoryRequirement.title, status: item.applicabilityStatus, rationale: item.rationale, ruleVersion: item.ruleVersion })),
    })),
  };
  return <RegulatoryProfileWorkspace initial={workspace} />;
}
