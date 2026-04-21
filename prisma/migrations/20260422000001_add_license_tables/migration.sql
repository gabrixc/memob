CREATE TABLE "license_applicants" (
    "id" UUID NOT NULL,
    "fullname" VARCHAR NOT NULL,
    "nokp" VARCHAR NOT NULL,
    "nama_perniagaan" VARCHAR NOT NULL,
    "lokasi_perniagaan" TEXT NOT NULL,
    "phone_number" VARCHAR,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "license_applicants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "license_applicants_nokp_key" ON "license_applicants"("nokp");

CREATE TABLE "license_applications" (
    "id" UUID NOT NULL,
    "applicant_id" UUID NOT NULL,
    "district" VARCHAR NOT NULL,
    "entertainment_type" VARCHAR NOT NULL,
    "status" VARCHAR NOT NULL DEFAULT 'DALAM_PROSES',
    "documents" JSONB NOT NULL DEFAULT '[]',
    "remarks" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "license_applications_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "license_applications"
    ADD CONSTRAINT "license_applications_applicant_id_fkey"
    FOREIGN KEY ("applicant_id") REFERENCES "license_applicants"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed from existing pendaftar table
INSERT INTO "license_applicants" ("id", "fullname", "nokp", "nama_perniagaan", "lokasi_perniagaan", "is_active", "created_at")
SELECT "id", "fullname", "nokp", "nama_perniagaan", "lokasi_perniagaan", true, "created_at"
FROM "pendaftar"
ON CONFLICT ("nokp") DO NOTHING;
