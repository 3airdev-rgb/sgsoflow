import { NextResponse } from "next/server";
import { getAuthorizationContext, requireSession } from "@/server/auth/session";
import { errorResponse } from "@/server/errors";
import { createRegulatoryDesignation, getGovernanceWorkspace } from "@/server/governance/service";
import { getLocalGovernancePreview } from "@/server/governance/preview";
import { assertLocalPreviewReadScope, assertNotLocalPreviewMutation } from "@/server/local-preview";
import { designationSchema, governanceScopeSchema } from "@/server/validation/schemas";

export async function GET(request: Request, { params }: { params: Promise<{ airportId: string }> }) {
  try {
    const { airportId } = await params;
    const { organizationId } = governanceScopeSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const session = await requireSession();
    if (assertLocalPreviewReadScope(session, organizationId, airportId)) return NextResponse.json(getLocalGovernancePreview());
    const authz = await getAuthorizationContext(session.userId);
    return NextResponse.json(await getGovernanceWorkspace({ authz, organizationId, airportId }));
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request, { params }: { params: Promise<{ airportId: string }> }) {
  try {
    const session = await requireSession(); assertNotLocalPreviewMutation(session);
    const { airportId } = await params;
    const { organizationId, ...input } = designationSchema.parse(await request.json());
    const authz = await getAuthorizationContext(session.userId);
    const designation = await createRegulatoryDesignation({ actor: session, authz, organizationId, airportId, userId: session.userId }, input);
    return NextResponse.json({ designation }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
