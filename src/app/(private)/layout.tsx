import Link from "next/link";
import { db } from "@/server/db";
import { requirePageSession } from "@/server/auth/session";
import { ContextSelector } from "@/components/context-selector";
import { LogoutButton } from "@/components/logout-button";
import { isLocalPreviewSession, LOCAL_PREVIEW_AIRPORT_ID, LOCAL_PREVIEW_ORGANIZATION_ID } from "@/server/local-preview";

export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePageSession();
  const preview = isLocalPreviewSession(session);
  const memberships = preview ? [] : await db.membership.findMany({ where: { userId: session.userId, status: "ACTIVE", deletedAt: null, organization: { status: "ACTIVE", deletedAt: null } }, include: { organization: true, airportAccesses: { where: { status: "ACTIVE", deletedAt: null, airport: { status: "ACTIVE", deletedAt: null } }, include: { airport: true } } } });
  const organizations = preview ? [{ id: LOCAL_PREVIEW_ORGANIZATION_ID, name: "SGSOFlow Local" }] : memberships.map((item) => ({ id: item.organizationId, name: item.organization.tradeName ?? item.organization.legalName }));
  const airports = preview ? [{ id: LOCAL_PREVIEW_AIRPORT_ID, name: "Aeródromo de visualização local", organizationId: LOCAL_PREVIEW_ORGANIZATION_ID }] : memberships.flatMap((item) => item.airportAccesses.map((access) => ({ id: access.airportId, name: access.airport.name, organizationId: item.organizationId })));
  return <div className="shell"><aside><div className="brand">Aero SGSO</div><nav><Link href="/dashboard">Dashboard</Link><Link href="/settings">Configurações</Link><Link className="nav-child" href="/settings/regulatory-profile">Perfil Regulatório</Link><Link className="nav-child" href="/settings/organizational-structure">Estrutura Organizacional</Link><Link className="nav-child" href="/settings/safety-policy">Política e Objetivos</Link></nav></aside><div className="workspace"><header><ContextSelector organizations={organizations} airports={airports} activeOrganizationId={session.activeOrganizationId} activeAirportId={session.activeAirportId} readOnly={preview} /><div className="user"><span>{session.user.name}</span><LogoutButton /></div></header><main>{preview && <p className="preview-notice">Visualização local sem banco de dados. Alterações estão desabilitadas.</p>}{children}</main></div></div>;
}
