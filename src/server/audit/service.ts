import type { Prisma, PrismaClient } from "@prisma/client";

export type AuditEvent = {
  userId?: string; organizationId?: string; airportId?: string; action: string;
  entityType: string; entityId?: string; previousValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue; metadata?: Prisma.InputJsonValue;
};
type AuditClient = Pick<PrismaClient, "auditLog"> | Prisma.TransactionClient;

export async function recordAuditEvent(client: AuditClient, event: AuditEvent) {
  return client.auditLog.create({ data: event });
}
