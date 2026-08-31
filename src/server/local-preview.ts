import { timingSafeEqual } from "node:crypto";
import { ForbiddenError } from "@/server/errors";

export const LOCAL_PREVIEW_USER_ID = "00000000-0000-4000-8000-000000000001";
export const LOCAL_PREVIEW_ORGANIZATION_ID = "00000000-0000-4000-8000-000000000002";
export const LOCAL_PREVIEW_AIRPORT_ID = "00000000-0000-4000-8000-000000000003";

export function isLocalPreviewEnabled() {
  return process.env.NODE_ENV === "development" && process.env.LOCAL_PREVIEW_MODE === "true";
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function authenticateLocalPreview(email: string, password: string) {
  if (!isLocalPreviewEnabled()) return null;
  const expectedEmail = process.env.LOCAL_PREVIEW_EMAIL;
  const expectedPassword = process.env.LOCAL_PREVIEW_PASSWORD;
  const token = process.env.LOCAL_PREVIEW_SESSION_TOKEN;
  if (!expectedEmail || !expectedPassword || !token || !safeEqual(email, expectedEmail) || !safeEqual(password, expectedPassword)) return null;
  return {
    token,
    expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
    user: { id: LOCAL_PREVIEW_USER_ID, name: "Administrador Local", email: expectedEmail },
  };
}

export function getLocalPreviewSession(token: string | undefined) {
  if (!isLocalPreviewEnabled() || !token || !process.env.LOCAL_PREVIEW_SESSION_TOKEN || !safeEqual(token, process.env.LOCAL_PREVIEW_SESSION_TOKEN)) return null;
  return {
    id: "local-preview-session",
    userId: LOCAL_PREVIEW_USER_ID,
    activeOrganizationId: LOCAL_PREVIEW_ORGANIZATION_ID,
    activeAirportId: LOCAL_PREVIEW_AIRPORT_ID,
    user: { id: LOCAL_PREVIEW_USER_ID, name: "Administrador Local", email: process.env.LOCAL_PREVIEW_EMAIL ?? "admin@example.local" },
    activeOrganization: { id: LOCAL_PREVIEW_ORGANIZATION_ID, legalName: "Organização de visualização local", tradeName: "SGSOFlow Local" },
    activeAirport: { id: LOCAL_PREVIEW_AIRPORT_ID, organizationId: LOCAL_PREVIEW_ORGANIZATION_ID, name: "Aeródromo de visualização local" },
    localPreview: true as const,
  };
}

export function isLocalPreviewSession(session: { id: string }) {
  return isLocalPreviewEnabled() && session.id === "local-preview-session";
}

export const LOCAL_PREVIEW_WRITE_MESSAGE = "Operações de escrita estão desabilitadas no modo de visualização local.";

export type LocalPreviewAwareActor = { id?: string; userId: string };

export function assertNotLocalPreviewMutation(actor: LocalPreviewAwareActor) {
  const previewActor = actor.id === "local-preview-session" || actor.userId === LOCAL_PREVIEW_USER_ID;
  if (isLocalPreviewEnabled() && previewActor) throw new ForbiddenError(LOCAL_PREVIEW_WRITE_MESSAGE);
}

export function assertLocalPreviewReadScope(session: { id: string }, organizationId: string, airportId?: string) {
  if (!isLocalPreviewSession(session)) return false;
  const validOrganization = organizationId === LOCAL_PREVIEW_ORGANIZATION_ID;
  const validAirport = !airportId || airportId === LOCAL_PREVIEW_AIRPORT_ID;
  if (!validOrganization || !validAirport) throw new ForbiddenError();
  return true;
}
