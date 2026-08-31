import { NextResponse } from "next/server";
import { getAuthorizationContext, requireSession } from "@/server/auth/session";
import { errorResponse } from "@/server/errors";
import { revokeSafetyCommitteeMember } from "@/server/governance/service";
import { assertNotLocalPreviewMutation } from "@/server/local-preview";
import { committeeMemberRevocationSchema } from "@/server/validation/schemas";

export async function POST(request: Request, { params }: { params: Promise<{ airportId: string; committeeId: string; memberId: string }> }) {
  try {
    const session = await requireSession(); assertNotLocalPreviewMutation(session);
    const { airportId, committeeId, memberId } = await params;
    const { organizationId, effectiveTo } = committeeMemberRevocationSchema.parse(await request.json());
    const authz = await getAuthorizationContext(session.userId);
    return NextResponse.json({ member: await revokeSafetyCommitteeMember({ actor: session, authz, organizationId, airportId, userId: session.userId }, committeeId, memberId, effectiveTo) });
  } catch (error) { return errorResponse(error); }
}
