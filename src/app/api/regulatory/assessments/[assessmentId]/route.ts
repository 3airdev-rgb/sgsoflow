import { NextResponse } from "next/server";
import { getAuthorizationContext, requireSession } from "@/server/auth/session";
import { errorResponse, NotFoundError } from "@/server/errors";
import { getRegulatoryAssessment } from "@/server/regulatory/service";
import { regulatoryScopeSchema } from "@/server/validation/schemas";
import { isLocalPreviewSession } from "@/server/local-preview";

export async function GET(request: Request, { params }: { params: Promise<{ assessmentId: string }> }) {
  try {
    const { assessmentId } = await params;
    const { organizationId } = regulatoryScopeSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const session = await requireSession();
    if (isLocalPreviewSession(session)) throw new NotFoundError("Avaliação não disponível no modo de visualização local.");
    const authz = await getAuthorizationContext(session.userId);
    return NextResponse.json({ assessment: await getRegulatoryAssessment({ authz, organizationId, assessmentId }) });
  } catch (error) { return errorResponse(error); }
}
