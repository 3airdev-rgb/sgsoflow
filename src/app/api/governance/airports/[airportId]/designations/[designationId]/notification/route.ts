import { NextResponse } from "next/server";
import { getAuthorizationContext, requireSession } from "@/server/auth/session";
import { errorResponse } from "@/server/errors";
import { recordAnacDesignationNotification } from "@/server/governance/service";
import { assertNotLocalPreviewMutation } from "@/server/local-preview";
import { designationNotificationSchema } from "@/server/validation/schemas";

export async function POST(request: Request, { params }: { params: Promise<{ airportId: string; designationId: string }> }) {
  try {
    const session = await requireSession();
    assertNotLocalPreviewMutation(session);
    const { airportId, designationId } = await params;
    const { organizationId, notifiedAt, evidence } = designationNotificationSchema.parse(await request.json());
    const authz = await getAuthorizationContext(session.userId);
    const designation = await recordAnacDesignationNotification({ actor: session, authz, organizationId, airportId, userId: session.userId }, designationId, { notifiedAt, evidence });
    return NextResponse.json({ designation });
  } catch (error) { return errorResponse(error); }
}
