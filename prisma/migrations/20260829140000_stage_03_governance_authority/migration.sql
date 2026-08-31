CREATE TYPE "RegulatoryDesignationStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'REVOKED');
CREATE TYPE "RegulatoryRoleMultiplicity" AS ENUM ('SINGLE', 'MULTIPLE');
CREATE TYPE "RegulatoryAccumulationPolicy" AS ENUM ('ALLOWED', 'REQUIRES_REVIEW');
CREATE TYPE "CommitteeApplicability" AS ENUM ('REQUIRED', 'NOT_REQUIRED', 'REQUIRES_REVIEW');
CREATE TYPE "CommitteeMemberStatus" AS ENUM ('ACTIVE', 'REVOKED');
CREATE TYPE "DesignationNotificationStatus" AS ENUM ('PENDING', 'SUBMITTED', 'OVERDUE', 'NOT_APPLICABLE');
CREATE TYPE "CommitteeMemberType" AS ENUM ('REQUIRED_MEMBER', 'ADDITIONAL_MEMBER');

CREATE TABLE "regulatory_roles" (
  "id" UUID NOT NULL,
  "code" VARCHAR(80) NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "description" TEXT NOT NULL,
  "source_reference" VARCHAR(120),
  "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
  "holder_multiplicity" "RegulatoryRoleMultiplicity" NOT NULL DEFAULT 'SINGLE',
  "accumulation_policy" "RegulatoryAccumulationPolicy" NOT NULL DEFAULT 'REQUIRES_REVIEW',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "regulatory_roles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "regulatory_designations" (
  "id" UUID NOT NULL,
  "airport_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "regulatory_role_id" UUID NOT NULL,
  "effective_from" DATE NOT NULL,
  "effective_to" DATE,
  "designation_date" DATE NOT NULL,
  "status" "RegulatoryDesignationStatus" NOT NULL DEFAULT 'DRAFT',
  "designation_reference" VARCHAR(200),
  "additional_prerogatives" TEXT,
  "responsibility_limits" TEXT,
  "reports_to_designation_id" UUID,
  "notification_due_date" DATE,
  "notification_status" "DesignationNotificationStatus" NOT NULL DEFAULT 'PENDING',
  "notified_at" TIMESTAMPTZ(6),
  "notification_evidence" VARCHAR(500),
  "notes" TEXT,
  "created_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "regulatory_designations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "regulatory_designations_period_check" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from"),
  CONSTRAINT "regulatory_designations_reporting_check" CHECK ("reports_to_designation_id" IS NULL OR "reports_to_designation_id" <> "id"),
  CONSTRAINT "regulatory_designations_notification_evidence_check" CHECK ("notification_status" <> 'SUBMITTED' OR ("notified_at" IS NOT NULL AND NULLIF(BTRIM("notification_evidence"), '') IS NOT NULL)),
  CONSTRAINT "regulatory_designations_notification_due_check" CHECK (("notification_status" = 'NOT_APPLICABLE' AND "notification_due_date" IS NULL) OR ("notification_status" <> 'NOT_APPLICABLE' AND "notification_due_date" IS NOT NULL))
);

CREATE TABLE "regulatory_responsibilities" (
  "id" UUID NOT NULL,
  "regulatory_role_id" UUID NOT NULL,
  "code" VARCHAR(100) NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "description" TEXT NOT NULL,
  "source_reference" VARCHAR(120),
  "source_reference" VARCHAR(500),
  "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "regulatory_responsibilities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "regulatory_authorities" (
  "id" UUID NOT NULL,
  "code" VARCHAR(100) NOT NULL,
  "name" VARCHAR(180) NOT NULL,
  "description" TEXT NOT NULL,
  "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "regulatory_authorities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "regulatory_role_authorities" (
  "id" UUID NOT NULL,
  "regulatory_role_id" UUID NOT NULL,
  "regulatory_authority_id" UUID NOT NULL,
  "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
  "effective_from" DATE NOT NULL,
  "effective_to" DATE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "regulatory_role_authorities_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "regulatory_role_authorities_period_check" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from")
);

CREATE TABLE "safety_committees" (
  "id" UUID NOT NULL,
  "airport_id" UUID NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
  "applicability" "CommitteeApplicability" NOT NULL DEFAULT 'REQUIRES_REVIEW',
  "effective_from" DATE NOT NULL,
  "effective_to" DATE,
  "created_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "safety_committees_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "safety_committees_period_check" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from")
);

CREATE TABLE "safety_committee_members" (
  "id" UUID NOT NULL,
  "safety_committee_id" UUID NOT NULL,
  "airport_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "role_in_committee" VARCHAR(120) NOT NULL,
  "member_type" "CommitteeMemberType" NOT NULL DEFAULT 'ADDITIONAL_MEMBER',
  "effective_from" DATE NOT NULL,
  "effective_to" DATE,
  "status" "CommitteeMemberStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "safety_committee_members_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "safety_committee_members_period_check" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from")
);

CREATE UNIQUE INDEX "regulatory_roles_code_key" ON "regulatory_roles"("code");
CREATE INDEX "regulatory_roles_status_idx" ON "regulatory_roles"("status");
CREATE UNIQUE INDEX "regulatory_designations_id_airport_id_key" ON "regulatory_designations"("id", "airport_id");
CREATE INDEX "regulatory_designations_airport_status_period_idx" ON "regulatory_designations"("airport_id", "status", "effective_from", "effective_to");
CREATE INDEX "regulatory_designations_user_status_period_idx" ON "regulatory_designations"("user_id", "status", "effective_from", "effective_to");
CREATE INDEX "regulatory_designations_role_status_idx" ON "regulatory_designations"("regulatory_role_id", "status");
CREATE INDEX "regulatory_designations_notification_status_due_idx" ON "regulatory_designations"("notification_status", "notification_due_date");
CREATE INDEX "regulatory_designations_reports_to_idx" ON "regulatory_designations"("reports_to_designation_id");
CREATE UNIQUE INDEX "regulatory_responsibilities_role_code_key" ON "regulatory_responsibilities"("regulatory_role_id", "code");
CREATE INDEX "regulatory_responsibilities_status_idx" ON "regulatory_responsibilities"("status");
CREATE UNIQUE INDEX "regulatory_authorities_code_key" ON "regulatory_authorities"("code");
CREATE INDEX "regulatory_authorities_status_idx" ON "regulatory_authorities"("status");
CREATE UNIQUE INDEX "regulatory_role_authorities_role_authority_from_key" ON "regulatory_role_authorities"("regulatory_role_id", "regulatory_authority_id", "effective_from");
CREATE INDEX "regulatory_role_authorities_authority_status_period_idx" ON "regulatory_role_authorities"("regulatory_authority_id", "status", "effective_from", "effective_to");
CREATE UNIQUE INDEX "safety_committees_id_airport_id_key" ON "safety_committees"("id", "airport_id");
CREATE INDEX "safety_committees_airport_status_period_idx" ON "safety_committees"("airport_id", "status", "effective_from", "effective_to");
CREATE UNIQUE INDEX "safety_committee_members_id_committee_id_key" ON "safety_committee_members"("id", "safety_committee_id");
CREATE INDEX "safety_committee_members_committee_status_period_idx" ON "safety_committee_members"("safety_committee_id", "status", "effective_from", "effective_to");
CREATE INDEX "safety_committee_members_airport_user_status_idx" ON "safety_committee_members"("airport_id", "user_id", "status");

ALTER TABLE "regulatory_designations" ADD CONSTRAINT "regulatory_designations_airport_id_fkey" FOREIGN KEY ("airport_id") REFERENCES "airports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "regulatory_designations" ADD CONSTRAINT "regulatory_designations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "regulatory_designations" ADD CONSTRAINT "regulatory_designations_role_id_fkey" FOREIGN KEY ("regulatory_role_id") REFERENCES "regulatory_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "regulatory_designations" ADD CONSTRAINT "regulatory_designations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "regulatory_designations" ADD CONSTRAINT "regulatory_designations_reports_to_fkey" FOREIGN KEY ("reports_to_designation_id") REFERENCES "regulatory_designations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "regulatory_responsibilities" ADD CONSTRAINT "regulatory_responsibilities_role_id_fkey" FOREIGN KEY ("regulatory_role_id") REFERENCES "regulatory_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "regulatory_role_authorities" ADD CONSTRAINT "regulatory_role_authorities_role_id_fkey" FOREIGN KEY ("regulatory_role_id") REFERENCES "regulatory_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "regulatory_role_authorities" ADD CONSTRAINT "regulatory_role_authorities_authority_id_fkey" FOREIGN KEY ("regulatory_authority_id") REFERENCES "regulatory_authorities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "safety_committees" ADD CONSTRAINT "safety_committees_airport_id_fkey" FOREIGN KEY ("airport_id") REFERENCES "airports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "safety_committees" ADD CONSTRAINT "safety_committees_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "safety_committee_members" ADD CONSTRAINT "safety_committee_members_committee_airport_fkey" FOREIGN KEY ("safety_committee_id", "airport_id") REFERENCES "safety_committees"("id", "airport_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "safety_committee_members" ADD CONSTRAINT "safety_committee_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Exclusive roles are serialized and checked against overlapping active periods.
CREATE OR REPLACE FUNCTION enforce_exclusive_regulatory_designation() RETURNS trigger AS $$
DECLARE role_multiplicity "RegulatoryRoleMultiplicity";
BEGIN
  IF NEW.status <> 'ACTIVE' THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(NEW.airport_id::text || ':' || NEW.regulatory_role_id::text));
  SELECT holder_multiplicity INTO role_multiplicity FROM regulatory_roles WHERE id = NEW.regulatory_role_id;
  IF role_multiplicity = 'SINGLE' AND EXISTS (
    SELECT 1 FROM regulatory_designations d
    WHERE d.airport_id = NEW.airport_id
      AND d.regulatory_role_id = NEW.regulatory_role_id
      AND d.status = 'ACTIVE'
      AND d.id <> NEW.id
      AND daterange(d.effective_from, COALESCE(d.effective_to, 'infinity'::date), '[]') && daterange(NEW.effective_from, COALESCE(NEW.effective_to, 'infinity'::date), '[]')
  ) THEN RAISE EXCEPTION 'conflicting active exclusive regulatory designation'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER regulatory_designations_exclusive BEFORE INSERT OR UPDATE ON "regulatory_designations" FOR EACH ROW EXECUTE FUNCTION enforce_exclusive_regulatory_designation();

-- Terminal historical designations are immutable; transitions happen before terminal state is stored.
CREATE OR REPLACE FUNCTION prevent_historical_designation_mutation() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'regulatory designations cannot be deleted'; END IF;
  IF OLD.status IN ('SUPERSEDED', 'REVOKED') THEN RAISE EXCEPTION 'historical regulatory designations are immutable'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER regulatory_designations_history_immutable BEFORE UPDATE OR DELETE ON "regulatory_designations" FOR EACH ROW EXECUTE FUNCTION prevent_historical_designation_mutation();

CREATE OR REPLACE FUNCTION prevent_governance_hard_delete() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'governance history cannot be deleted';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER safety_committees_no_delete BEFORE DELETE ON "safety_committees" FOR EACH ROW EXECUTE FUNCTION prevent_governance_hard_delete();
CREATE TRIGGER safety_committee_members_no_delete BEFORE DELETE ON "safety_committee_members" FOR EACH ROW EXECUTE FUNCTION prevent_governance_hard_delete();
