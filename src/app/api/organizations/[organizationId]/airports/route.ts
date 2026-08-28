import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { getAuthorizationContext, requireSession } from "@/server/auth/session";
import { requireOrganizationAccess } from "@/server/authorization/policies";
import { errorResponse } from "@/server/errors";

export async function GET(_: Request, { params }: { params: Promise<{ organizationId: string }> }) {
  try {
    const { organizationId } = await params;
    const session = await requireSession();
    const authz = await getAuthorizationContext(session.userId);
    const grant = requireOrganizationAccess(authz, organizationId);
    const allowedIds = grant.airports.map((airport) => airport.airportId);
    const airports = await db.airport.findMany({ where: { id: { in: allowedIds }, organizationId, status: "ACTIVE", deletedAt: null }, select: { id: true, name: true, icaoCode: true, iataCode: true } });
    return NextResponse.json({ airports });
  } catch (error) { return errorResponse(error); }
}
