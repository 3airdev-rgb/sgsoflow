import { db } from "@/server/db";
import { requireAirportAccess, requireOrganizationAccess, type AuthorizationContext } from "@/server/authorization/policies";
import { NotFoundError } from "@/server/errors";
import { recordAuditEvent } from "@/server/audit/service";

export async function switchContext(input: { sessionId: string; organizationId: string; airportId: string | null; authz: AuthorizationContext }) {
  requireOrganizationAccess(input.authz, input.organizationId, "context:switch");
  if (input.airportId) requireAirportAccess(input.authz, input.organizationId, input.airportId, "context:switch");
  const session = await db.session.findUnique({ where: { id: input.sessionId } });
  if (!session || session.revokedAt) throw new NotFoundError("Sessão não encontrada.");
  return db.$transaction(async (tx) => {
    const updated = await tx.session.update({ where: { id: input.sessionId }, data: { activeOrganizationId: input.organizationId, activeAirportId: input.airportId, lastSeenAt: new Date() } });
    await recordAuditEvent(tx, { userId: session.userId, organizationId: input.organizationId, airportId: input.airportId ?? undefined, action: "CONTEXT_SWITCHED", entityType: "Session", entityId: session.id, previousValue: { organizationId: session.activeOrganizationId, airportId: session.activeAirportId }, newValue: { organizationId: input.organizationId, airportId: input.airportId } });
    return updated;
  });
}
