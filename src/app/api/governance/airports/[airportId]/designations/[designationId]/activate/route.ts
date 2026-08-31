import { NextResponse } from "next/server";
import { getAuthorizationContext, requireSession } from "@/server/auth/session";
import { errorResponse } from "@/server/errors";
import { activateRegulatoryDesignation } from "@/server/governance/service";
import { assertNotLocalPreviewMutation } from "@/server/local-preview";
import { governanceScopeSchema } from "@/server/validation/schemas";

export async function POST(request: Request, { params }: { params: Promise<{ airportId: string; designationId: string }> }) {
  try {
    const session = await requireSession(); assertNotLocalPreviewMutation(session);
    const { airportId, designationId } = await params;
    const { organizationId } = governanceScopeSchema.parse(await request.json());
    const authz = await getAuthorizationContext(session.userId);
    return NextResponse.json({ designation: await activateRegulatoryDesignation({ actor: session, authz, organizationId, airportId, userId: session.userId }, designationId) });
  } catch (error) { return errorResponse(error); }
}
