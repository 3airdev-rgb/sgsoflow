import { NextResponse } from "next/server";
import { getAuthorizationContext, requireSession } from "@/server/auth/session";
import { errorResponse } from "@/server/errors";
import { createSafetyCommittee } from "@/server/governance/service";
import { assertNotLocalPreviewMutation } from "@/server/local-preview";
import { safetyCommitteeSchema } from "@/server/validation/schemas";

export async function POST(request: Request, { params }: { params: Promise<{ airportId: string }> }) {
  try {
    const session = await requireSession(); assertNotLocalPreviewMutation(session);
    const { airportId } = await params;
    const { organizationId, ...input } = safetyCommitteeSchema.parse(await request.json());
    const authz = await getAuthorizationContext(session.userId);
    return NextResponse.json({ committee: await createSafetyCommittee({ actor: session, authz, organizationId, airportId, userId: session.userId }, input) }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
