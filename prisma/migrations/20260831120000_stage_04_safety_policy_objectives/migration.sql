CREATE TYPE "SafetyPolicyVersionStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'APPROVED', 'ACTIVE', 'SUPERSEDED', 'ARCHIVED');
CREATE TYPE "SafetyPolicyReviewResult" AS ENUM ('COMPLETE', 'INCOMPLETE', 'REQUIRES_REVIEW');
CREATE TYPE "SafetyObjectiveStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ACHIEVED', 'NOT_ACHIEVED', 'CANCELLED', 'SUPERSEDED');

CREATE TABLE "safety_policies" (
  "id" UUID NOT NULL, "airport_id" UUID NOT NULL, "created_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "safety_policies_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "safety_policies_airport_id_key" ON "safety_policies"("airport_id");
CREATE UNIQUE INDEX "safety_policies_id_airport_id_key" ON "safety_policies"("id", "airport_id");

CREATE TABLE "safety_policy_versions" (
  "id" UUID NOT NULL, "safety_policy_id" UUID NOT NULL, "airport_id" UUID NOT NULL, "version" INTEGER NOT NULL,
  "status" "SafetyPolicyVersionStatus" NOT NULL DEFAULT 'DRAFT', "formal_statement" TEXT NOT NULL,
  "organization_commitments" TEXT NOT NULL, "responsibilities" TEXT NOT NULL, "resource_commitment" TEXT NOT NULL,
  "applicable_requirements_commitment" TEXT NOT NULL, "continuous_improvement_commitment" TEXT NOT NULL,
  "safety_reporting_principles" TEXT, "effective_from" DATE, "effective_to" DATE, "authored_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "safety_policy_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "safety_policy_versions_period_check" CHECK ("effective_to" IS NULL OR "effective_from" IS NULL OR "effective_to" >= "effective_from")
);
CREATE UNIQUE INDEX "safety_policy_versions_safety_policy_id_version_key" ON "safety_policy_versions"("safety_policy_id", "version");
CREATE UNIQUE INDEX "safety_policy_versions_id_airport_id_key" ON "safety_policy_versions"("id", "airport_id");
CREATE INDEX "safety_policy_versions_airport_id_status_effective_from_effective_to_idx" ON "safety_policy_versions"("airport_id", "status", "effective_from", "effective_to");
CREATE UNIQUE INDEX "safety_policy_versions_one_active_per_airport" ON "safety_policy_versions"("airport_id") WHERE "status" = 'ACTIVE';

CREATE TABLE "safety_policy_approvals" (
  "id" UUID NOT NULL, "policy_version_id" UUID NOT NULL, "airport_id" UUID NOT NULL, "approved_by" UUID NOT NULL,
  "regulatory_designation_id" UUID NOT NULL, "authority_code" VARCHAR(100) NOT NULL, "rationale" TEXT NOT NULL,
  "evidence_reference" VARCHAR(500), "approved_at" TIMESTAMPTZ(6) NOT NULL, "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "safety_policy_approvals_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "safety_policy_approvals_policy_version_id_key" ON "safety_policy_approvals"("policy_version_id");
CREATE UNIQUE INDEX "safety_policy_approvals_policy_version_id_airport_id_key" ON "safety_policy_approvals"("policy_version_id", "airport_id");
CREATE INDEX "safety_policy_approvals_airport_id_approved_at_idx" ON "safety_policy_approvals"("airport_id", "approved_at");

CREATE TABLE "safety_policy_reviews" (
  "id" UUID NOT NULL, "policy_version_id" UUID NOT NULL, "airport_id" UUID NOT NULL, "reviewed_by" UUID NOT NULL,
  "reviewed_at" TIMESTAMPTZ(6) NOT NULL, "next_review_at" DATE, "reason" TEXT NOT NULL,
  "result" "SafetyPolicyReviewResult" NOT NULL, "content_changed" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "safety_policy_reviews_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "safety_policy_reviews_next_review_check" CHECK ("next_review_at" IS NULL OR "next_review_at" >= "reviewed_at"::date),
  CONSTRAINT "safety_policy_reviews_no_content_change_check" CHECK ("content_changed" = false)
);
CREATE INDEX "safety_policy_reviews_airport_id_reviewed_at_idx" ON "safety_policy_reviews"("airport_id", "reviewed_at");
CREATE INDEX "safety_policy_reviews_policy_version_id_reviewed_at_idx" ON "safety_policy_reviews"("policy_version_id", "reviewed_at");

CREATE TABLE "safety_policy_communications" (
  "id" UUID NOT NULL, "policy_version_id" UUID NOT NULL, "airport_id" UUID NOT NULL, "audience_scope" VARCHAR(300) NOT NULL,
  "communication_method" VARCHAR(160) NOT NULL, "communicated_at" TIMESTAMPTZ(6) NOT NULL, "evidence_reference" VARCHAR(500) NOT NULL,
  "recorded_by" UUID NOT NULL, "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "safety_policy_communications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "safety_policy_communications_evidence_check" CHECK (length(trim("evidence_reference")) > 0)
);
CREATE INDEX "safety_policy_communications_airport_id_communicated_at_idx" ON "safety_policy_communications"("airport_id", "communicated_at");
CREATE INDEX "safety_policy_communications_policy_version_id_communicated_at_idx" ON "safety_policy_communications"("policy_version_id", "communicated_at");

CREATE TABLE "safety_objectives" (
  "id" UUID NOT NULL, "policy_version_id" UUID NOT NULL, "airport_id" UUID NOT NULL, "owner_user_id" UUID NOT NULL,
  "status" "SafetyObjectiveStatus" NOT NULL DEFAULT 'DRAFT', "title" VARCHAR(240) NOT NULL, "description" TEXT NOT NULL,
  "rationale" TEXT NOT NULL, "intended_outcome" TEXT NOT NULL, "measure_criterion" TEXT NOT NULL,
  "target_value" VARCHAR(120), "unit" VARCHAR(80), "due_date" DATE NOT NULL, "effective_from" DATE NOT NULL,
  "effective_to" DATE, "observed_result" TEXT, "created_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "safety_objectives_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "safety_objectives_period_check" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from"),
  CONSTRAINT "safety_objectives_due_date_check" CHECK ("due_date" >= "effective_from")
);
CREATE UNIQUE INDEX "safety_objectives_id_airport_id_key" ON "safety_objectives"("id", "airport_id");
CREATE INDEX "safety_objectives_airport_id_status_due_date_idx" ON "safety_objectives"("airport_id", "status", "due_date");
CREATE INDEX "safety_objectives_policy_version_id_status_idx" ON "safety_objectives"("policy_version_id", "status");
CREATE INDEX "safety_objectives_owner_user_id_status_idx" ON "safety_objectives"("owner_user_id", "status");

ALTER TABLE "safety_policies" ADD CONSTRAINT "safety_policies_airport_id_fkey" FOREIGN KEY ("airport_id") REFERENCES "airports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "safety_policies" ADD CONSTRAINT "safety_policies_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "safety_policy_versions" ADD CONSTRAINT "safety_policy_versions_safety_policy_id_airport_id_fkey" FOREIGN KEY ("safety_policy_id", "airport_id") REFERENCES "safety_policies"("id", "airport_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "safety_policy_versions" ADD CONSTRAINT "safety_policy_versions_airport_id_fkey" FOREIGN KEY ("airport_id") REFERENCES "airports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "safety_policy_versions" ADD CONSTRAINT "safety_policy_versions_authored_by_fkey" FOREIGN KEY ("authored_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "safety_policy_approvals" ADD CONSTRAINT "safety_policy_approvals_policy_version_id_airport_id_fkey" FOREIGN KEY ("policy_version_id", "airport_id") REFERENCES "safety_policy_versions"("id", "airport_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "safety_policy_approvals" ADD CONSTRAINT "safety_policy_approvals_airport_id_fkey" FOREIGN KEY ("airport_id") REFERENCES "airports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "safety_policy_approvals" ADD CONSTRAINT "safety_policy_approvals_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "safety_policy_approvals" ADD CONSTRAINT "safety_policy_approvals_regulatory_designation_id_airport_id_fkey" FOREIGN KEY ("regulatory_designation_id", "airport_id") REFERENCES "regulatory_designations"("id", "airport_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "safety_policy_reviews" ADD CONSTRAINT "safety_policy_reviews_policy_version_id_airport_id_fkey" FOREIGN KEY ("policy_version_id", "airport_id") REFERENCES "safety_policy_versions"("id", "airport_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "safety_policy_reviews" ADD CONSTRAINT "safety_policy_reviews_airport_id_fkey" FOREIGN KEY ("airport_id") REFERENCES "airports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "safety_policy_reviews" ADD CONSTRAINT "safety_policy_reviews_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "safety_policy_communications" ADD CONSTRAINT "safety_policy_communications_policy_version_id_airport_id_fkey" FOREIGN KEY ("policy_version_id", "airport_id") REFERENCES "safety_policy_versions"("id", "airport_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "safety_policy_communications" ADD CONSTRAINT "safety_policy_communications_airport_id_fkey" FOREIGN KEY ("airport_id") REFERENCES "airports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "safety_policy_communications" ADD CONSTRAINT "safety_policy_communications_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "safety_objectives" ADD CONSTRAINT "safety_objectives_policy_version_id_airport_id_fkey" FOREIGN KEY ("policy_version_id", "airport_id") REFERENCES "safety_policy_versions"("id", "airport_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "safety_objectives" ADD CONSTRAINT "safety_objectives_airport_id_fkey" FOREIGN KEY ("airport_id") REFERENCES "airports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "safety_objectives" ADD CONSTRAINT "safety_objectives_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "safety_objectives" ADD CONSTRAINT "safety_objectives_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION prevent_controlled_safety_record_delete() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'Controlled safety records cannot be deleted'; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER safety_policy_no_delete BEFORE DELETE ON "safety_policies" FOR EACH ROW EXECUTE FUNCTION prevent_controlled_safety_record_delete();
CREATE TRIGGER safety_policy_version_no_delete BEFORE DELETE ON "safety_policy_versions" FOR EACH ROW EXECUTE FUNCTION prevent_controlled_safety_record_delete();
CREATE TRIGGER safety_policy_approval_no_delete BEFORE DELETE ON "safety_policy_approvals" FOR EACH ROW EXECUTE FUNCTION prevent_controlled_safety_record_delete();
CREATE TRIGGER safety_policy_review_no_delete BEFORE DELETE ON "safety_policy_reviews" FOR EACH ROW EXECUTE FUNCTION prevent_controlled_safety_record_delete();
CREATE TRIGGER safety_policy_communication_no_delete BEFORE DELETE ON "safety_policy_communications" FOR EACH ROW EXECUTE FUNCTION prevent_controlled_safety_record_delete();
CREATE TRIGGER safety_objective_no_delete BEFORE DELETE ON "safety_objectives" FOR EACH ROW EXECUTE FUNCTION prevent_controlled_safety_record_delete();

CREATE FUNCTION protect_controlled_policy_content() RETURNS trigger AS $$ BEGIN
  IF OLD."status" IN ('APPROVED', 'ACTIVE', 'SUPERSEDED', 'ARCHIVED') AND (
    NEW."version" IS DISTINCT FROM OLD."version" OR NEW."formal_statement" IS DISTINCT FROM OLD."formal_statement" OR
    NEW."organization_commitments" IS DISTINCT FROM OLD."organization_commitments" OR NEW."responsibilities" IS DISTINCT FROM OLD."responsibilities" OR
    NEW."resource_commitment" IS DISTINCT FROM OLD."resource_commitment" OR NEW."applicable_requirements_commitment" IS DISTINCT FROM OLD."applicable_requirements_commitment" OR
    NEW."continuous_improvement_commitment" IS DISTINCT FROM OLD."continuous_improvement_commitment" OR NEW."safety_reporting_principles" IS DISTINCT FROM OLD."safety_reporting_principles"
  ) THEN RAISE EXCEPTION 'Approved policy content is immutable; create a new version'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER safety_policy_version_content_immutable BEFORE UPDATE ON "safety_policy_versions" FOR EACH ROW EXECUTE FUNCTION protect_controlled_policy_content();
