ALTER TABLE "Lead" ADD COLUMN "district" TEXT;
ALTER TABLE "Lead" ADD COLUMN "googleMapsUrl" TEXT;
ALTER TABLE "Lead" ADD COLUMN "priority" TEXT;
ALTER TABLE "Lead" ADD COLUMN "normGoogleMapsUrl" TEXT;

CREATE INDEX "Lead_district_idx" ON "Lead"("district");
CREATE INDEX "Lead_priority_idx" ON "Lead"("priority");
CREATE INDEX "Lead_normGoogleMapsUrl_idx" ON "Lead"("normGoogleMapsUrl");
CREATE UNIQUE INDEX "Lead_normGoogleMapsUrl_key" ON "Lead"("normGoogleMapsUrl");
