import { NextResponse } from "next/server";
import { getAuthorizationContext, requireSession } from "@/server/auth/session";
import { errorResponse } from "@/server/errors";
import { activateRegulatoryProfile } from "@/server/regulatory/service";
import { regulatoryScopeSchema } from "@/server/validation/schemas";

export async function POST(request: Request, { params }: { params: Promise<{ airportId: string; profileId: string }> }) {
  try {
    const { airportId, profileId } = await params;
    const { organizationId } = regulatoryScopeSchema.parse(await request.json());
    const session = await requireSession();
    const authz = await getAuthorizationContext(session.userId);
    const profile = await activateRegulatoryProfile({ authz, organizationId, airportId, profileId, userId: session.userId });
    return NextResponse.json({ profile });
  } catch (error) { return errorResponse(error); }
}
