-- Track the manual search/filter indexes in Prisma migration history.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Lead_tags_gin" ON "Lead" USING GIN ("tags");

CREATE INDEX IF NOT EXISTS "Lead_normName_trgm"
  ON "Lead" USING GIN ("normName" gin_trgm_ops);
