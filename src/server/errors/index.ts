import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(public code: string, message: string, public status: number, public details?: unknown) { super(message); }
}
export class UnauthenticatedError extends AppError { constructor() { super("UNAUTHENTICATED", "Autenticação necessária.", 401); } }
export class ForbiddenError extends AppError { constructor(message = "Você não possui acesso a este recurso.") { super("FORBIDDEN", message, 403); } }
export class NotFoundError extends AppError { constructor(message = "Recurso não encontrado.") { super("NOT_FOUND", message, 404); } }
export class ConflictError extends AppError { constructor(message: string) { super("CONFLICT", message, 409); } }

export function errorResponse(error: unknown) {
  if (error instanceof ZodError) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Dados inválidos.", details: error.flatten() } }, { status: 422 });
  if (error instanceof AppError) return NextResponse.json({ error: { code: error.code, message: error.message, details: error.details } }, { status: error.status });
  console.error("Unhandled server error", error);
  return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Ocorreu um erro interno." } }, { status: 500 });
}
