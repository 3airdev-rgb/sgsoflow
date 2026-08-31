import { NextResponse } from "next/server";
import { getAuthorizationContext, requireSession } from "@/server/auth/session";
import { errorResponse } from "@/server/errors";
import { assertLocalPreviewReadScope, assertNotLocalPreviewMutation } from "@/server/local-preview";
import { getLocalSafetyPolicyPreview } from "@/server/safety-policy/preview";
import { createSafetyPolicyVersion, getSafetyPolicyWorkspace } from "@/server/safety-policy/service";
import { safetyPolicyScopeSchema, safetyPolicyVersionSchema } from "@/server/validation/schemas";
export async function GET(request: Request, { params }: { params: Promise<{ airportId: string }> }) { try { const { airportId } = await params; const { organizationId } = safetyPolicyScopeSchema.parse(Object.fromEntries(new URL(request.url).searchParams)); const session = await requireSession(); if (assertLocalPreviewReadScope(session, organizationId, airportId)) return NextResponse.json(getLocalSafetyPolicyPreview()); const authz = await getAuthorizationContext(session.userId); return NextResponse.json(await getSafetyPolicyWorkspace({ authz, organizationId, airportId })); } catch (error) { return errorResponse(error); } }
export async function POST(request: Request, { params }: { params: Promise<{ airportId: string }> }) { try { const session = await requireSession(); assertNotLocalPreviewMutation(session); const { airportId } = await params; const { organizationId, ...input } = safetyPolicyVersionSchema.parse(await request.json()); const authz = await getAuthorizationContext(session.userId); return NextResponse.json({ version: await createSafetyPolicyVersion({ actor: session, authz, organizationId, airportId, userId: session.userId }, input) }, { status: 201 }); } catch (error) { return errorResponse(error); } }
