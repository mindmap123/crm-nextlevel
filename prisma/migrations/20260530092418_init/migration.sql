-- CreateEnum
CREATE TYPE "Source" AS ENUM ('GOOGLE_MAPS', 'SHERLOCK_MAPS', 'MANUEL', 'IMPORT_CSV', 'IMPORT_JSON');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('BRUT', 'A_ENRICHIR', 'A_QUALIFIER', 'QUALIFIE', 'A_CONTACTER', 'CONTACTE', 'EN_DISCUSSION', 'PERDU', 'GAGNE');

-- CreateEnum
CREATE TYPE "Tag" AS ENUM ('LOCAL', 'SITE_FAIBLE', 'SANS_SITE', 'BON_POTENTIEL', 'A_VERIFIER', 'DOUBLON', 'PRIORITAIRE');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'DONE');

-- CreateEnum
CREATE TYPE "ImportFormat" AS ENUM ('CSV', 'JSON', 'MANUEL');

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "address" TEXT,
    "city" TEXT,
    "source" "Source" NOT NULL DEFAULT 'MANUEL',
    "category" TEXT,
    "googleRating" DOUBLE PRECISION,
    "reviewCount" INTEGER,
    "hasWebsite" BOOLEAN NOT NULL DEFAULT false,
    "technologies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "score" INTEGER NOT NULL DEFAULT 0,
    "scoreBreakdown" JSONB,
    "status" "Status" NOT NULL DEFAULT 'BRUT',
    "tags" "Tag"[] DEFAULT ARRAY[]::"Tag"[],
    "lastContactAt" TIMESTAMP(3),
    "nextAction" TEXT,
    "nextActionAt" TIMESTAMP(3),
    "internalNotes" TEXT,
    "normPhone" TEXT,
    "normEmail" TEXT,
    "normDomain" TEXT,
    "normName" TEXT,
    "masterId" TEXT,
    "importBatchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "dueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "actor" TEXT DEFAULT 'Warren',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "format" "ImportFormat" NOT NULL,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "importedCount" INTEGER NOT NULL DEFAULT 0,
    "duplicateCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "cursor" INTEGER NOT NULL DEFAULT 0,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "weights" JSONB NOT NULL,
    "targetCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetCities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoreConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_score_idx" ON "Lead"("score");

-- CreateIndex
CREATE INDEX "Lead_city_idx" ON "Lead"("city");

-- CreateIndex
CREATE INDEX "Lead_normPhone_idx" ON "Lead"("normPhone");

-- CreateIndex
CREATE INDEX "Lead_normEmail_idx" ON "Lead"("normEmail");

-- CreateIndex
CREATE INDEX "Lead_normDomain_idx" ON "Lead"("normDomain");

-- CreateIndex
CREATE INDEX "Lead_normName_idx" ON "Lead"("normName");

-- CreateIndex
CREATE INDEX "Lead_masterId_idx" ON "Lead"("masterId");

-- CreateIndex
CREATE INDEX "Task_leadId_idx" ON "Task"("leadId");

-- CreateIndex
CREATE INDEX "Task_status_dueAt_idx" ON "Task"("status", "dueAt");

-- CreateIndex
CREATE INDEX "Activity_leadId_idx" ON "Activity"("leadId");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
