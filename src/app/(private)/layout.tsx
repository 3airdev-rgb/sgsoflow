import Link from "next/link";
import { db } from "@/server/db";
import { requirePageSession } from "@/server/auth/session";
import { ContextSelector } from "@/components/context-selector";
import { LogoutButton } from "@/components/logout-button";

export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePageSession();
  const memberships = await db.membership.findMany({ where: { userId: session.userId, status: "ACTIVE", deletedAt: null, organization: { status: "ACTIVE", deletedAt: null } }, include: { organization: true, airportAccesses: { where: { status: "ACTIVE", deletedAt: null, airport: { status: "ACTIVE", deletedAt: null } }, include: { airport: true } } } });
  const organizations = memberships.map((item) => ({ id: item.organizationId, name: item.organization.tradeName ?? item.organization.legalName }));
  const airports = memberships.flatMap((item) => item.airportAccesses.map((access) => ({ id: access.airportId, name: access.airport.name, organizationId: item.organizationId })));
  return <div className="shell"><aside><div className="brand">Aero SGSO</div><nav><Link href="/dashboard">Dashboard</Link><Link href="/settings">Configurações</Link></nav></aside><div className="workspace"><header><ContextSelector organizations={organizations} airports={airports} activeOrganizationId={session.activeOrganizationId} activeAirportId={session.activeAirportId} /><div className="user"><span>{session.user.name}</span><LogoutButton /></div></header><main>{children}</main></div></div>;
}
