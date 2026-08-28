import { NextResponse } from "next/server";
import { getAuthorizationContext, requireSession } from "@/server/auth/session";
import { errorResponse } from "@/server/errors";
import { createRegulatoryProfile, getRegulatoryWorkspace } from "@/server/regulatory/service";
import { regulatoryProfileSchema, regulatoryScopeSchema } from "@/server/validation/schemas";

export async function GET(request: Request, { params }: { params: Promise<{ airportId: string }> }) {
  try {
    const { airportId } = await params;
    const { organizationId } = regulatoryScopeSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const session = await requireSession();
    const authz = await getAuthorizationContext(session.userId);
    return NextResponse.json(await getRegulatoryWorkspace({ authz, organizationId, airportId }));
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request, { params }: { params: Promise<{ airportId: string }> }) {
  try {
    const { airportId } = await params;
    const { organizationId, ...profile } = regulatoryProfileSchema.parse(await request.json());
    const session = await requireSession();
    const authz = await getAuthorizationContext(session.userId);
    const created = await createRegulatoryProfile({ authz, organizationId, airportId, userId: session.userId, profile });
    return NextResponse.json({ profile: created }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
