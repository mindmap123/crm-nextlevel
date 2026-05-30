-- À exécuter une fois sur Neon après la première migration.
-- Active le fuzzy match "nom proche" côté base + index des filtres.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Filtres combinés sur le tableau de tags (opérateurs @>, &&)
CREATE INDEX IF NOT EXISTS "Lead_tags_gin" ON "Lead" USING GIN ("tags");

-- Recherche trigramme sur le nom normalisé (dedup faible côté SQL)
CREATE INDEX IF NOT EXISTS "Lead_normName_trgm"
  ON "Lead" USING GIN ("normName" gin_trgm_ops);
