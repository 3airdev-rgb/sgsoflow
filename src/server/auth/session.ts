import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { UnauthenticatedError } from "@/server/errors";
import type { AuthorizationContext } from "@/server/authorization/policies";
import { getLocalPreviewSession, LOCAL_PREVIEW_AIRPORT_ID, LOCAL_PREVIEW_ORGANIZATION_ID, LOCAL_PREVIEW_USER_ID } from "@/server/local-preview";

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
  const localPreview = getLocalPreviewSession(token);
  if (localPreview) return localPreview;
  return db.session.findFirst({
    where: { tokenHash: hashToken(token), revokedAt: null, expiresAt: { gt: new Date() }, user: { status: "ACTIVE", deletedAt: null } },
    include: { user: true, activeOrganization: true, activeAirport: true },
  });
}

export async function requireSession() { const session = await getSession(); if (!session) throw new UnauthenticatedError(); return session; }
export async function requirePageSession() { const session = await getSession(); if (!session) redirect("/login"); return session; }

export async function getAuthorizationContext(userId: string): Promise<AuthorizationContext> {
  if (userId === LOCAL_PREVIEW_USER_ID && getLocalPreviewSession(process.env.LOCAL_PREVIEW_SESSION_TOKEN)) {
    return { userId, organizations: [{ organizationId: LOCAL_PREVIEW_ORGANIZATION_ID, role: "ORGANIZATION_ADMIN", airports: [{ airportId: LOCAL_PREVIEW_AIRPORT_ID, organizationId: LOCAL_PREVIEW_ORGANIZATION_ID, role: "AIRPORT_ADMIN" }] }] };
  }
  const memberships = await db.membership.findMany({
    where: { userId, status: "ACTIVE", deletedAt: null, organization: { status: "ACTIVE", deletedAt: null } },
    include: { airportAccesses: { where: { status: "ACTIVE", deletedAt: null, airport: { status: "ACTIVE", deletedAt: null } }, include: { airport: { select: { organizationId: true } } } } },
  });
  return { userId, organizations: memberships.map((membership) => ({ organizationId: membership.organizationId, role: membership.role, airports: membership.airportAccesses.map((access) => ({ airportId: access.airportId, organizationId: access.airport.organizationId, role: access.role })) })) };
}
