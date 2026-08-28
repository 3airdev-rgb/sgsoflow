import { z } from "zod";

export const loginSchema = z.object({ email: z.email().max(254).transform((v) => v.trim().toLowerCase()), password: z.string().min(12).max(128) });
export const contextSchema = z.object({ organizationId: z.uuid(), airportId: z.uuid().nullable() });
export const userSchema = z.object({ name: z.string().trim().min(2).max(160), email: z.email().max(254), status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]) });
export const organizationSchema = z.object({ legalName: z.string().trim().min(2).max(200), tradeName: z.string().trim().max(200).nullable().optional(), status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]) });
export const airportSchema = z.object({ organizationId: z.uuid(), name: z.string().trim().min(2).max(200), icaoCode: z.string().regex(/^[A-Z]{4}$/).nullable().optional(), iataCode: z.string().regex(/^[A-Z]{3}$/).nullable().optional(), city: z.string().trim().min(2).max(120), state: z.string().regex(/^[A-Z]{2}$/), country: z.string().regex(/^[A-Z]{2}$/).default("BR"), status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]) });
