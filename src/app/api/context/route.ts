import { NextResponse } from "next/server";
import { getAuthorizationContext, requireSession } from "@/server/auth/session";
import { switchContext } from "@/server/context/service";
import { errorResponse } from "@/server/errors";
import { contextSchema } from "@/server/validation/schemas";
import { assertNotLocalPreviewMutation } from "@/server/local-preview";

export async function PUT(request: Request) {
  try {
    const session = await requireSession();
    assertNotLocalPreviewMutation(session);
    const input = contextSchema.parse(await request.json());
    const authz = await getAuthorizationContext(session.userId);
    await switchContext({ sessionId: session.id, ...input, authz });
    return NextResponse.json({ ok: true });
  } catch (error) { return errorResponse(error); }
}
