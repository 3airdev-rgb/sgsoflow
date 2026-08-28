import { describe, expect, it } from "vitest";
import { airportSchema, organizationSchema, userSchema } from "@/server/validation/schemas";
describe("validação das entidades base", () => {
  it("valida User e Organization", () => { expect(userSchema.safeParse({ name: "Ana Lima", email: "ana@example.com", status: "ACTIVE" }).success).toBe(true); expect(organizationSchema.safeParse({ legalName: "Operador Aeroportuário", status: "ACTIVE" }).success).toBe(true); });
  it("rejeita códigos inválidos do Airport", () => expect(airportSchema.safeParse({ organizationId: crypto.randomUUID(), name: "Aeroporto", icaoCode: "abc", city: "Recife", state: "PE", status: "ACTIVE" }).success).toBe(false));
});
