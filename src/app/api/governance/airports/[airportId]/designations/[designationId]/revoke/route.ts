import { NextResponse } from "next/server";
import { getAuthorizationContext, requireSession } from "@/server/auth/session";
import { errorResponse } from "@/server/errors";
import { revokeRegulatoryDesignation } from "@/server/governance/service";
import { assertNotLocalPreviewMutation } from "@/server/local-preview";
import { designationRevocationSchema } from "@/server/validation/schemas";

export async function POST(request: Request, { params }: { params: Promise<{ airportId: string; designationId: string }> }) {
  try {
    const session = await requireSession(); assertNotLocalPreviewMutation(session);
    const { airportId, designationId } = await params;
    const { organizationId, effectiveTo } = designationRevocationSchema.parse(await request.json());
    const authz = await getAuthorizationContext(session.userId);
    return NextResponse.json({ designation: await revokeRegulatoryDesignation({ actor: session, authz, organizationId, airportId, userId: session.userId }, designationId, effectiveTo) });
  } catch (error) { return errorResponse(error); }
}
