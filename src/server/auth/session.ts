import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { UnauthenticatedError } from "@/server/errors";
import type { AuthorizationContext } from "@/server/authorization/policies";

export const SESSION_COOKIE = "aero_session";
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  await db.session.create({ data: { userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + SESSION_DURATION_MS) } });
  return { token, expiresAt: new Date(Date.now() + SESSION_DURATION_MS) };
}

export async function revokeSession(token: string) { await db.session.updateMany({ where: { tokenHash: hashToken(token), revokedAt: null }, data: { revokedAt: new Date() } }); }

export async function getSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return db.session.findFirst({
    where: { tokenHash: hashToken(token), revokedAt: null, expiresAt: { gt: new Date() }, user: { status: "ACTIVE", deletedAt: null } },
    include: { user: true, activeOrganization: true, activeAirport: true },
  });
}

export async function requireSession() { const session = await getSession(); if (!session) throw new UnauthenticatedError(); return session; }
export async function requirePageSession() { const session = await getSession(); if (!session) redirect("/login"); return session; }

export async function getAuthorizationContext(userId: string): Promise<AuthorizationContext> {
  const memberships = await db.membership.findMany({
    where: { userId, status: "ACTIVE", deletedAt: null, organization: { status: "ACTIVE", deletedAt: null } },
    include: { airportAccesses: { where: { status: "ACTIVE", deletedAt: null, airport: { status: "ACTIVE", deletedAt: null } }, include: { airport: { select: { organizationId: true } } } } },
  });
  return { userId, organizations: memberships.map((membership) => ({ organizationId: membership.organizationId, role: membership.role, airports: membership.airportAccesses.map((access) => ({ airportId: access.airportId, organizationId: access.airport.organizationId, role: access.role })) })) };
}
