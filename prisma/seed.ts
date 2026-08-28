import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();
async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@example.local").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "change-me-before-production";
  if (password.length < 12) throw new Error("SEED_ADMIN_PASSWORD deve conter pelo menos 12 caracteres.");
  const user = await prisma.user.upsert({ where: { email }, update: { name: "Administrador local", passwordHash: await hash(password, 12), status: "ACTIVE" }, create: { name: "Administrador local", email, passwordHash: await hash(password, 12) } });
  const organization = await prisma.organization.upsert({ where: { id: "00000000-0000-4000-8000-000000000001" }, update: {}, create: { id: "00000000-0000-4000-8000-000000000001", legalName: "Organização local de desenvolvimento", tradeName: "Operador local" } });
  const airport = await prisma.airport.upsert({ where: { id: "00000000-0000-4000-8000-000000000002" }, update: {}, create: { id: "00000000-0000-4000-8000-000000000002", organizationId: organization.id, name: "Aeródromo local de desenvolvimento", city: "São Paulo", state: "SP" } });
  const membership = await prisma.membership.upsert({ where: { userId_organizationId: { userId: user.id, organizationId: organization.id } }, update: { role: "ORGANIZATION_ADMIN", status: "ACTIVE" }, create: { userId: user.id, organizationId: organization.id, role: "ORGANIZATION_ADMIN" } });
  await prisma.airportAccess.upsert({ where: { membershipId_airportId: { membershipId: membership.id, airportId: airport.id } }, update: { role: "AIRPORT_ADMIN", status: "ACTIVE" }, create: { membershipId: membership.id, airportId: airport.id, role: "AIRPORT_ADMIN" } });
  await prisma.auditLog.create({ data: { userId: user.id, organizationId: organization.id, airportId: airport.id, action: "DEVELOPMENT_SEED_APPLIED", entityType: "System", metadata: { environment: "local" } } });
}
main().finally(() => prisma.$disconnect());
