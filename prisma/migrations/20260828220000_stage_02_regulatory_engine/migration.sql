CREATE TYPE "RegulatoryProfileStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUPERSEDED');
CREATE TYPE "AerodromeUse" AS ENUM ('PUBLIC', 'PRIVATE');
CREATE TYPE "OperationalClass" AS ENUM ('CLASS_I', 'CLASS_II', 'CLASS_III', 'CLASS_IV');
CREATE TYPE "RegulatoryRequirementType" AS ENUM ('OBR', 'FC', 'REC', 'PROD');
CREATE TYPE "ApplicabilityStatus" AS ENUM ('APPLICABLE', 'NOT_APPLICABLE', 'CONDITIONAL', 'REVIEW_REQUIRED');
CREATE TYPE "ManagementRegime" AS ENUM ('SGSO', 'PGSO', 'CRITICAL_SAFETY_ASPECTS', 'REVIEW_REQUIRED');

CREATE TABLE "regulatory_profiles" (
  "id" UUID NOT NULL,
  "airport_id" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "effective_from" DATE NOT NULL,
  "effective_to" DATE,
  "status" "RegulatoryProfileStatus" NOT NULL DEFAULT 'DRAFT',
  "aerodrome_use" "AerodromeUse",
  "operational_class" "OperationalClass",
  "has_operational_certificate" BOOLEAN,
  "is_military_shared_aerodrome" BOOLEAN,
  "certificate_number" VARCHAR(80),
  "operates_regular_rbac_121" BOOLEAN,
  "operates_regular_rbac_135" BOOLEAN,
  "has_sgso" BOOLEAN,
  "has_pgso" BOOLEAN,
  "regulatory_notes" TEXT,
  "created_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "regulatory_profiles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "regulatory_profiles_period_check" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from")
);

CREATE TABLE "regulatory_sources" (
  "id" UUID NOT NULL,
  "authority" VARCHAR(80) NOT NULL,
  "regulation" VARCHAR(80) NOT NULL,
  "amendment" VARCHAR(40),
  "revision" VARCHAR(40),
  "title" VARCHAR(240) NOT NULL,
  "effective_from" DATE NOT NULL,
  "effective_to" DATE,
  "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
  "official_reference" VARCHAR(500),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "regulatory_sources_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "regulatory_sources_period_check" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from")
);

CREATE TABLE "regulatory_requirements" (
  "id" UUID NOT NULL,
  "regulatory_source_id" UUID NOT NULL,
  "section" VARCHAR(40) NOT NULL,
  "subsection" VARCHAR(80),
  "title" VARCHAR(240) NOT NULL,
  "summary" TEXT NOT NULL,
  "requirement_type" "RegulatoryRequirementType" NOT NULL,
  "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
  "effective_from" DATE NOT NULL,
  "effective_to" DATE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "regulatory_requirements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "regulatory_requirements_period_check" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from")
);

CREATE TABLE "applicability_rules" (
  "id" UUID NOT NULL,
  "regulatory_requirement_id" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
  "conditions" JSONB NOT NULL,
  "result_when_matched" "ApplicabilityStatus" NOT NULL,
  "management_regime" "ManagementRegime",
  "rationale_template" TEXT NOT NULL,
  "effective_from" DATE NOT NULL,
  "effective_to" DATE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "applicability_rules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "applicability_rules_version_check" CHECK ("version" > 0),
  CONSTRAINT "applicability_rules_period_check" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from")
);

CREATE TABLE "applicability_assessments" (
  "id" UUID NOT NULL,
  "airport_id" UUID NOT NULL,
  "regulatory_profile_id" UUID NOT NULL,
  "evaluated_at" TIMESTAMPTZ(6) NOT NULL,
  "evaluated_by" UUID NOT NULL,
  "engine_version" VARCHAR(20) NOT NULL,
  "management_regime" "ManagementRegime" NOT NULL,
  "overall_result" "ApplicabilityStatus" NOT NULL,
  "rationale" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "applicability_assessments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "applicability_assessment_items" (
  "id" UUID NOT NULL,
  "applicability_assessment_id" UUID NOT NULL,
  "regulatory_requirement_id" UUID NOT NULL,
  "applicability_rule_id" UUID,
  "rule_version" INTEGER,
  "applicability_status" "ApplicabilityStatus" NOT NULL,
  "rationale" TEXT NOT NULL,
  "evaluation_metadata" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "applicability_assessment_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "regulatory_profiles_airport_id_version_key" ON "regulatory_profiles"("airport_id", "version");
CREATE UNIQUE INDEX "regulatory_profiles_id_airport_id_key" ON "regulatory_profiles"("id", "airport_id");
CREATE UNIQUE INDEX "regulatory_profiles_one_active_per_airport" ON "regulatory_profiles"("airport_id") WHERE "status" = 'ACTIVE';
CREATE INDEX "regulatory_profiles_airport_id_status_effective_from_idx" ON "regulatory_profiles"("airport_id", "status", "effective_from");
CREATE INDEX "regulatory_profiles_airport_id_effective_from_effective_to_idx" ON "regulatory_profiles"("airport_id", "effective_from", "effective_to");
CREATE UNIQUE INDEX "regulatory_sources_authority_regulation_amendment_revision_key" ON "regulatory_sources"("authority", "regulation", "amendment", "revision") NULLS NOT DISTINCT;
CREATE INDEX "regulatory_sources_status_effective_from_effective_to_idx" ON "regulatory_sources"("status", "effective_from", "effective_to");
CREATE UNIQUE INDEX "regulatory_requirements_source_section_subsection_key" ON "regulatory_requirements"("regulatory_source_id", "section", "subsection") NULLS NOT DISTINCT;
CREATE INDEX "regulatory_requirements_status_effective_from_effective_to_idx" ON "regulatory_requirements"("status", "effective_from", "effective_to");
CREATE UNIQUE INDEX "applicability_rules_requirement_version_key" ON "applicability_rules"("regulatory_requirement_id", "version");
CREATE UNIQUE INDEX "applicability_rules_id_requirement_id_key" ON "applicability_rules"("id", "regulatory_requirement_id");
CREATE INDEX "applicability_rules_status_effective_from_effective_to_idx" ON "applicability_rules"("status", "effective_from", "effective_to");
CREATE INDEX "applicability_assessments_airport_id_evaluated_at_idx" ON "applicability_assessments"("airport_id", "evaluated_at");
CREATE INDEX "applicability_assessments_regulatory_profile_id_idx" ON "applicability_assessments"("regulatory_profile_id");
CREATE INDEX "applicability_assessment_items_assessment_id_idx" ON "applicability_assessment_items"("applicability_assessment_id");
CREATE INDEX "applicability_assessment_items_requirement_id_idx" ON "applicability_assessment_items"("regulatory_requirement_id");

ALTER TABLE "regulatory_profiles" ADD CONSTRAINT "regulatory_profiles_airport_id_fkey" FOREIGN KEY ("airport_id") REFERENCES "airports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "regulatory_profiles" ADD CONSTRAINT "regulatory_profiles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "regulatory_requirements" ADD CONSTRAINT "regulatory_requirements_source_id_fkey" FOREIGN KEY ("regulatory_source_id") REFERENCES "regulatory_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "applicability_rules" ADD CONSTRAINT "applicability_rules_requirement_id_fkey" FOREIGN KEY ("regulatory_requirement_id") REFERENCES "regulatory_requirements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "applicability_assessments" ADD CONSTRAINT "applicability_assessments_airport_id_fkey" FOREIGN KEY ("airport_id") REFERENCES "airports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "applicability_assessments" ADD CONSTRAINT "applicability_assessments_profile_airport_fkey" FOREIGN KEY ("regulatory_profile_id", "airport_id") REFERENCES "regulatory_profiles"("id", "airport_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "applicability_assessments" ADD CONSTRAINT "applicability_assessments_evaluated_by_fkey" FOREIGN KEY ("evaluated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "applicability_assessment_items" ADD CONSTRAINT "assessment_items_assessment_id_fkey" FOREIGN KEY ("applicability_assessment_id") REFERENCES "applicability_assessments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "applicability_assessment_items" ADD CONSTRAINT "assessment_items_requirement_id_fkey" FOREIGN KEY ("regulatory_requirement_id") REFERENCES "regulatory_requirements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "applicability_assessment_items" ADD CONSTRAINT "assessment_items_rule_requirement_fkey" FOREIGN KEY ("applicability_rule_id", "regulatory_requirement_id") REFERENCES "applicability_rules"("id", "regulatory_requirement_id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION prevent_completed_assessment_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'completed applicability assessments are immutable';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER applicability_assessments_immutable BEFORE UPDATE OR DELETE ON "applicability_assessments" FOR EACH ROW EXECUTE FUNCTION prevent_completed_assessment_mutation();
CREATE TRIGGER applicability_assessment_items_immutable BEFORE UPDATE OR DELETE ON "applicability_assessment_items" FOR EACH ROW EXECUTE FUNCTION prevent_completed_assessment_mutation();
