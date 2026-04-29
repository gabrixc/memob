/*
  Warnings:

  - The primary key for the `license_applicants` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `license_applications` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "license_applications" DROP CONSTRAINT "license_applications_applicant_id_fkey";

-- AlterTable
ALTER TABLE "license_applicants" DROP CONSTRAINT "license_applicants_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "fullname" SET DATA TYPE TEXT,
ALTER COLUMN "nokp" SET DATA TYPE TEXT,
ALTER COLUMN "nama_perniagaan" SET DATA TYPE TEXT,
ALTER COLUMN "phone_number" SET DATA TYPE TEXT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "license_applicants_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "license_applications" DROP CONSTRAINT "license_applications_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "applicant_id" SET DATA TYPE TEXT,
ALTER COLUMN "district" SET DATA TYPE TEXT,
ALTER COLUMN "entertainment_type" SET DATA TYPE TEXT,
ALTER COLUMN "status" SET DATA TYPE TEXT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "license_applications_pkey" PRIMARY KEY ("id");

-- AddForeignKey
ALTER TABLE "license_applications" ADD CONSTRAINT "license_applications_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "license_applicants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
