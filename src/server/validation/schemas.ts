import { z } from "zod";

export const loginSchema = z.object({ email: z.email().max(254).transform((v) => v.trim().toLowerCase()), password: z.string().min(12).max(128) });
export const contextSchema = z.object({ organizationId: z.uuid(), airportId: z.uuid().nullable() });
export const userSchema = z.object({ name: z.string().trim().min(2).max(160), email: z.email().max(254), status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]) });
export const organizationSchema = z.object({ legalName: z.string().trim().min(2).max(200), tradeName: z.string().trim().max(200).nullable().optional(), status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]) });
export const airportSchema = z.object({ organizationId: z.uuid(), name: z.string().trim().min(2).max(200), icaoCode: z.string().regex(/^[A-Z]{4}$/).nullable().optional(), iataCode: z.string().regex(/^[A-Z]{3}$/).nullable().optional(), city: z.string().trim().min(2).max(120), state: z.string().regex(/^[A-Z]{2}$/), country: z.string().regex(/^[A-Z]{2}$/).default("BR"), status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]) });

const nullableBoolean = z.boolean().nullable();
export const regulatoryProfileSchema = z.object({
  organizationId: z.uuid(),
  effectiveFrom: z.coerce.date(),
  effectiveTo: z.coerce.date().nullable().optional(),
  aerodromeUse: z.enum(["PUBLIC", "PRIVATE"]).nullable(),
  operationalClass: z.enum(["CLASS_I", "CLASS_II", "CLASS_III", "CLASS_IV"]).nullable(),
  hasOperationalCertificate: nullableBoolean,
  isMilitarySharedAerodrome: nullableBoolean,
  certificateNumber: z.string().trim().max(80).nullable().optional(),
  operatesRegularRBAC121: nullableBoolean,
  operatesRegularRBAC135: nullableBoolean,
  hasSGSO: nullableBoolean,
  hasPGSO: nullableBoolean,
  regulatoryNotes: z.string().trim().max(4000).nullable().optional(),
}).superRefine((value, context) => {
  if (value.hasOperationalCertificate && !value.certificateNumber) {
    context.addIssue({ code: "custom", path: ["certificateNumber"], message: "Informe o número do certificado operacional." });
  }
  if (value.effectiveTo && value.effectiveTo < value.effectiveFrom) {
    context.addIssue({ code: "custom", path: ["effectiveTo"], message: "A vigência final deve ser posterior à inicial." });
  }
});

export const regulatoryScopeSchema = z.object({ organizationId: z.uuid() });
export const regulatoryAssessmentSchema = z.object({ organizationId: z.uuid(), regulatoryProfileId: z.uuid() });
