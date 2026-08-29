import { NextResponse } from "next/server";
import { getAuthorizationContext, requireSession } from "@/server/auth/session";
import { errorResponse } from "@/server/errors";
import { createRegulatoryProfile, getRegulatoryWorkspace } from "@/server/regulatory/service";
import { regulatoryProfileSchema, regulatoryScopeSchema } from "@/server/validation/schemas";
import { assertLocalPreviewReadScope, assertNotLocalPreviewMutation } from "@/server/local-preview";

export async function GET(request: Request, { params }: { params: Promise<{ airportId: string }> }) {
  try {
    const { airportId } = await params;
    const { organizationId } = regulatoryScopeSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const session = await requireSession();
    if (assertLocalPreviewReadScope(session, organizationId, airportId)) {
      return NextResponse.json({ airport: { id: airportId, name: "Aeródromo de visualização local", organizationId }, profiles: [], assessments: [] });
    }
    const authz = await getAuthorizationContext(session.userId);
    return NextResponse.json(await getRegulatoryWorkspace({ authz, organizationId, airportId }));
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request, { params }: { params: Promise<{ airportId: string }> }) {
  try {
    const session = await requireSession();
    assertNotLocalPreviewMutation(session);
    const { airportId } = await params;
    const { organizationId, ...profile } = regulatoryProfileSchema.parse(await request.json());
    const authz = await getAuthorizationContext(session.userId);
    const created = await createRegulatoryProfile({ authz, organizationId, airportId, userId: session.userId, profile });
    return NextResponse.json({ profile: created }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
