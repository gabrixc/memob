-- CreateTable
CREATE TABLE "data_blocks" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "primary_source_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "data_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "primary_sources" (
    "id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "table" TEXT,
    "query" TEXT,
    "data_block_id" TEXT NOT NULL,

    CONSTRAINT "primary_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "secondary_sources" (
    "id" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "table" TEXT,
    "query" TEXT,
    "join_key" TEXT NOT NULL,
    "data_block_id" TEXT NOT NULL,

    CONSTRAINT "secondary_sources_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "data_blocks"
ADD CONSTRAINT "data_blocks_primary_source_id_fkey"
FOREIGN KEY ("primary_source_id")
REFERENCES "primary_sources"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "primary_sources"
ADD CONSTRAINT "primary_sources_data_block_id_fkey"
FOREIGN KEY ("data_block_id")
REFERENCES "data_blocks"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "secondary_sources"
ADD CONSTRAINT "secondary_sources_data_block_id_fkey"
FOREIGN KEY ("data_block_id")
REFERENCES "data_blocks"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
