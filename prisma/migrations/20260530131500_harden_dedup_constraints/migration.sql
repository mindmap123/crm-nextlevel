-- Normalize cities for fuzzy/strong de-duplication and lock strong keys.
ALTER TABLE "Lead" ADD COLUMN "normCity" TEXT;

UPDATE "Lead"
SET "normCity" = NULLIF(
  regexp_replace(
    lower(
      translate(
        coalesce("city", ''),
        'ÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝàáâãäåçèéêëìíîïñòóôõöùúûüýÿ',
        'AAAAAACEEEEIIIINOOOOOUUUUYaaaaaaceeeeiiiinooooouuuuyy'
      )
    ),
    '[^a-z0-9]+',
    ' ',
    'g'
  ),
  ''
);

UPDATE "Lead" SET "normCity" = btrim("normCity") WHERE "normCity" IS NOT NULL;

CREATE INDEX "Lead_normCity_idx" ON "Lead"("normCity");

CREATE UNIQUE INDEX "Lead_normPhone_key" ON "Lead"("normPhone");
CREATE UNIQUE INDEX "Lead_normEmail_key" ON "Lead"("normEmail");
CREATE UNIQUE INDEX "Lead_normDomain_key" ON "Lead"("normDomain");
CREATE UNIQUE INDEX "Lead_normName_normCity_key" ON "Lead"("normName", "normCity");
