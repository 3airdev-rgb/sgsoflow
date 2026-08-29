import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, revokeSession } from "@/server/auth/session";
import { errorResponse } from "@/server/errors";
import { getLocalPreviewSession } from "@/server/local-preview";

export async function POST() {
  try {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (token && !getLocalPreviewSession(token)) await revokeSession(token);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", expires: new Date(0) });
    return response;
  } catch (error) { return errorResponse(error); }
}
