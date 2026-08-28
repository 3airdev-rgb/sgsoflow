import { compare } from "bcryptjs";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { createSession } from "./session";

export async function authenticate(email: string, password: string) {
  const user = await db.user.findFirst({ where: { email, status: "ACTIVE", deletedAt: null } });
  const valid = user ? await compare(password, user.passwordHash) : false;
  if (!user || !valid) throw new AppError("INVALID_CREDENTIALS", "E-mail ou senha inválidos.", 401);
  const session = await createSession(user.id);
  await db.auditLog.create({ data: { userId: user.id, action: "AUTH_LOGIN", entityType: "Session", metadata: { method: "password" } } });
  return { user, ...session };
}
