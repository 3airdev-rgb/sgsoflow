import { NextResponse } from "next/server";
import { getAuthorizationContext, requireSession } from "@/server/auth/session";
import { errorResponse } from "@/server/errors";
import { addSafetyCommitteeMember } from "@/server/governance/service";
import { assertNotLocalPreviewMutation } from "@/server/local-preview";
import { safetyCommitteeMemberSchema } from "@/server/validation/schemas";

export async function POST(request: Request, { params }: { params: Promise<{ airportId: string; committeeId: string }> }) {
  try {
    const session = await requireSession(); assertNotLocalPreviewMutation(session);
    const { airportId, committeeId } = await params;
    const { organizationId, ...input } = safetyCommitteeMemberSchema.parse(await request.json());
    const authz = await getAuthorizationContext(session.userId);
    return NextResponse.json({ member: await addSafetyCommitteeMember({ actor: session, authz, organizationId, airportId, userId: session.userId }, committeeId, input) }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
