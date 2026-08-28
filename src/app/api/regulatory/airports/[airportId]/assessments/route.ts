import { NextResponse } from "next/server";
import { getAuthorizationContext, requireSession } from "@/server/auth/session";
import { errorResponse } from "@/server/errors";
import { executeRegulatoryAssessment, getRegulatoryWorkspace } from "@/server/regulatory/service";
import { regulatoryAssessmentSchema, regulatoryScopeSchema } from "@/server/validation/schemas";

export async function GET(request: Request, { params }: { params: Promise<{ airportId: string }> }) {
  try {
    const { airportId } = await params;
    const { organizationId } = regulatoryScopeSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const session = await requireSession();
    const authz = await getAuthorizationContext(session.userId);
    const workspace = await getRegulatoryWorkspace({ authz, organizationId, airportId });
    return NextResponse.json({ assessments: workspace.assessments });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request, { params }: { params: Promise<{ airportId: string }> }) {
  try {
    const { airportId } = await params;
    const { organizationId, regulatoryProfileId } = regulatoryAssessmentSchema.parse(await request.json());
    const session = await requireSession();
    const authz = await getAuthorizationContext(session.userId);
    const assessment = await executeRegulatoryAssessment({ authz, organizationId, airportId, profileId: regulatoryProfileId, userId: session.userId });
    return NextResponse.json({ assessment }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
