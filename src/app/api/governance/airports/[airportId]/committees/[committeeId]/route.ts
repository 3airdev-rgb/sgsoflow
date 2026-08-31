import { NextResponse } from "next/server";
import { getAuthorizationContext, requireSession } from "@/server/auth/session";
import { errorResponse } from "@/server/errors";
import { updateSafetyCommittee } from "@/server/governance/service";
import { assertNotLocalPreviewMutation } from "@/server/local-preview";
import { safetyCommitteeUpdateSchema } from "@/server/validation/schemas";

export async function PATCH(request: Request, { params }: { params: Promise<{ airportId: string; committeeId: string }> }) {
  try {
    const session = await requireSession(); assertNotLocalPreviewMutation(session);
    const { airportId, committeeId } = await params;
    const { organizationId, ...input } = safetyCommitteeUpdateSchema.parse(await request.json());
    const authz = await getAuthorizationContext(session.userId);
    return NextResponse.json({ committee: await updateSafetyCommittee({ actor: session, authz, organizationId, airportId, userId: session.userId }, committeeId, input) });
  } catch (error) { return errorResponse(error); }
}
