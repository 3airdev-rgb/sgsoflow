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

const governancePeriodFields = {
  effectiveFrom: z.coerce.date(),
  effectiveTo: z.coerce.date().nullable().optional(),
};
const validGovernancePeriod = <T extends { effectiveFrom: Date; effectiveTo?: Date | null }>(value: T) => !value.effectiveTo || value.effectiveTo >= value.effectiveFrom;

export const designationSchema = z.object({ ...governancePeriodFields,
  organizationId: z.uuid(), holderUserId: z.uuid(), regulatoryRoleId: z.uuid(),
  designationDate: z.coerce.date(), designationReference: z.string().trim().max(200).nullable().optional(),
  additionalPrerogatives: z.string().trim().max(4000).nullable().optional(), responsibilityLimits: z.string().trim().max(4000).nullable().optional(),
  reportsToDesignationId: z.uuid().nullable().optional(), notes: z.string().trim().max(4000).nullable().optional(),
}).refine(validGovernancePeriod, { path: ["effectiveTo"], message: "A vigência final deve ser posterior à inicial." });
export const governanceScopeSchema = z.object({ organizationId: z.uuid() });
export const designationRevocationSchema = z.object({ organizationId: z.uuid(), effectiveTo: z.coerce.date() });
export const designationNotificationSchema = z.object({ organizationId: z.uuid(), notifiedAt: z.coerce.date(), evidence: z.string().trim().min(2).max(500) });
export const safetyCommitteeSchema = z.object({ ...governancePeriodFields,
  organizationId: z.uuid(), name: z.string().trim().min(2).max(200),
}).refine(validGovernancePeriod, { path: ["effectiveTo"], message: "A vigência final deve ser posterior à inicial." });
export const safetyCommitteeUpdateSchema = z.object({
  organizationId: z.uuid(), name: z.string().trim().min(2).max(200).optional(), status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
  effectiveTo: z.coerce.date().nullable().optional(),
});
export const safetyCommitteeMemberSchema = z.object({ ...governancePeriodFields,
  organizationId: z.uuid(), memberUserId: z.uuid(), roleInCommittee: z.string().trim().min(2).max(120), memberType: z.enum(["REQUIRED_MEMBER", "ADDITIONAL_MEMBER"]),
}).refine(validGovernancePeriod, { path: ["effectiveTo"], message: "A vigência final deve ser posterior à inicial." });
export const committeeMemberRevocationSchema = z.object({ organizationId: z.uuid(), effectiveTo: z.coerce.date() });

export const safetyPolicyScopeSchema = z.object({ organizationId: z.uuid() });
export const safetyPolicyVersionSchema = z.object({
  organizationId: z.uuid(), safetyPolicyId: z.uuid().optional(),
  formalStatement: z.string().trim().min(1).max(12000), organizationCommitments: z.string().trim().min(1).max(12000),
  responsibilities: z.string().trim().min(1).max(12000), resourceCommitment: z.string().trim().min(1).max(12000),
  applicableRequirementsCommitment: z.string().trim().min(1).max(12000), continuousImprovementCommitment: z.string().trim().min(1).max(12000),
  safetyReportingPrinciples: z.string().trim().max(12000).nullable().optional(),
});
export const safetyPolicyApprovalSchema = z.object({ organizationId: z.uuid(), rationale: z.string().trim().min(2).max(4000), evidenceReference: z.string().trim().max(500).nullable().optional() });
export const safetyPolicyActivationSchema = z.object({ organizationId: z.uuid(), effectiveFrom: z.coerce.date() });
export const safetyPolicyReviewSchema = z.object({
  organizationId: z.uuid(), reviewedAt: z.coerce.date(), nextReviewAt: z.coerce.date().nullable().optional(),
  reason: z.string().trim().min(2).max(4000), result: z.enum(["COMPLETE", "INCOMPLETE", "REQUIRES_REVIEW"]), contentChanged: z.boolean().default(false),
});
export const safetyPolicyCommunicationSchema = z.object({
  organizationId: z.uuid(), audienceScope: z.string().trim().min(2).max(300), communicationMethod: z.string().trim().min(2).max(160),
  communicatedAt: z.coerce.date(), evidenceReference: z.string().trim().min(2).max(500),
});
export const safetyObjectiveSchema = z.object({
  organizationId: z.uuid(), policyVersionId: z.uuid(), ownerUserId: z.uuid(), title: z.string().trim().min(2).max(240),
  description: z.string().trim().min(2).max(12000), rationale: z.string().trim().min(2).max(12000), intendedOutcome: z.string().trim().min(2).max(12000),
  measureCriterion: z.string().trim().min(2).max(12000), targetValue: z.string().trim().max(120).nullable().optional(), unit: z.string().trim().max(80).nullable().optional(),
  dueDate: z.coerce.date(), effectiveFrom: z.coerce.date(), effectiveTo: z.coerce.date().nullable().optional(),
}).superRefine((value, context) => {
  if (value.dueDate < value.effectiveFrom) context.addIssue({ code: "custom", path: ["dueDate"], message: "O prazo não pode anteceder o início." });
  if (value.effectiveTo && value.effectiveTo < value.effectiveFrom) context.addIssue({ code: "custom", path: ["effectiveTo"], message: "A vigência final não pode anteceder o início." });
});
export const safetyObjectiveStatusSchema = z.object({ organizationId: z.uuid(), status: z.enum(["ACTIVE", "ACHIEVED", "NOT_ACHIEVED", "CANCELLED", "SUPERSEDED"]), observedResult: z.string().trim().max(12000).nullable().optional() });
