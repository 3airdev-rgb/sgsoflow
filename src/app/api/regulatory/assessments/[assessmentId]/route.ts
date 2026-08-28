import { NextResponse } from "next/server";
import { getAuthorizationContext, requireSession } from "@/server/auth/session";
import { errorResponse } from "@/server/errors";
import { getRegulatoryAssessment } from "@/server/regulatory/service";
import { regulatoryScopeSchema } from "@/server/validation/schemas";

export async function GET(request: Request, { params }: { params: Promise<{ assessmentId: string }> }) {
  try {
    const { assessmentId } = await params;
    const { organizationId } = regulatoryScopeSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const session = await requireSession();
    const authz = await getAuthorizationContext(session.userId);
    return NextResponse.json({ assessment: await getRegulatoryAssessment({ authz, organizationId, assessmentId }) });
  } catch (error) { return errorResponse(error); }
}
