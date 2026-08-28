import { NextResponse } from "next/server";
import { authenticate } from "@/server/auth/service";
import { SESSION_COOKIE } from "@/server/auth/session";
import { errorResponse } from "@/server/errors";
import { loginSchema } from "@/server/validation/schemas";

export async function POST(request: Request) {
  try {
    const credentials = loginSchema.parse(await request.json());
    const { token, expiresAt, user } = await authenticate(credentials.email, credentials.password);
    const response = NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } });
    response.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.SESSION_COOKIE_SECURE === "true", path: "/", expires: expiresAt });
    return response;
  } catch (error) { return errorResponse(error); }
}
