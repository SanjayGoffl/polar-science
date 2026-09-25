-- AlterTable
ALTER TABLE "Station" ADD COLUMN "sourceUrl" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AIContent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewStatus" TEXT NOT NULL DEFAULT 'pending',
    "reviewedAt" DATETIME,
    "editedByReviewer" BOOLEAN NOT NULL DEFAULT false,
    "sourceHash" TEXT,
    "promptVersion" TEXT,
    "sourceReportId" TEXT,
    "sourceFieldEntryId" TEXT,
    CONSTRAINT "AIContent_sourceReportId_fkey" FOREIGN KEY ("sourceReportId") REFERENCES "Report" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AIContent_sourceFieldEntryId_fkey" FOREIGN KEY ("sourceFieldEntryId") REFERENCES "FieldEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    -- Hand-written (Prisma cannot express CHECK). Re-declared here because the table is rebuilt.
    CONSTRAINT "AIContent_exactly_one_source" CHECK ((("sourceReportId" IS NOT NULL) + ("sourceFieldEntryId" IS NOT NULL)) = 1),
    CONSTRAINT "AIContent_kind_valid" CHECK ("kind" IN ('explanation', 'caption')),
    CONSTRAINT "AIContent_review_valid" CHECK ("reviewStatus" IN ('pending', 'approved', 'rejected'))
);
INSERT INTO "new_AIContent" ("audience", "generatedAt", "id", "kind", "model", "provider", "reviewStatus", "reviewedAt", "sourceFieldEntryId", "sourceReportId", "text") SELECT "audience", "generatedAt", "id", "kind", "model", "provider", "reviewStatus", "reviewedAt", "sourceFieldEntryId", "sourceReportId", "text" FROM "AIContent";
DROP TABLE "AIContent";
ALTER TABLE "new_AIContent" RENAME TO "AIContent";
CREATE INDEX "AIContent_sourceReportId_kind_audience_sourceHash_idx" ON "AIContent"("sourceReportId", "kind", "audience", "sourceHash");
CREATE TABLE "new_Expedition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "number" INTEGER,
    "year" INTEGER NOT NULL,
    "season" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "summary" TEXT NOT NULL,
    "heroImage" TEXT NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "contentStatus" TEXT NOT NULL DEFAULT 'illustrative',
    "sourceUrl" TEXT,
    "hasStory" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Expedition_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Expedition_contentStatus_valid" CHECK ("contentStatus" IN ('illustrative', 'official'))
);
INSERT INTO "new_Expedition" ("featured", "hasStory", "heroImage", "id", "lat", "lng", "name", "number", "region", "season", "shortName", "slug", "stationId", "summary", "year") SELECT "featured", "hasStory", "heroImage", "id", "lat", "lng", "name", "number", "region", "season", "shortName", "slug", "stationId", "summary", "year" FROM "Expedition";
DROP TABLE "Expedition";
ALTER TABLE "new_Expedition" RENAME TO "Expedition";
CREATE UNIQUE INDEX "Expedition_slug_key" ON "Expedition"("slug");
CREATE TABLE "new_Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "expeditionId" TEXT NOT NULL,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "authors" TEXT NOT NULL,
    "venue" TEXT,
    "publishedOn" DATETIME NOT NULL,
    "abstract" TEXT NOT NULL,
    "externalUrl" TEXT,
    "contentStatus" TEXT NOT NULL DEFAULT 'illustrative',
    "sourceSystem" TEXT,
    "sourceId" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Report_expeditionId_fkey" FOREIGN KEY ("expeditionId") REFERENCES "Expedition" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Report_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Report_contentStatus_valid" CHECK ("contentStatus" IN ('illustrative', 'official')),
    -- Official content must say where it came from.
    CONSTRAINT "Report_official_has_source" CHECK ("contentStatus" <> 'official' OR "externalUrl" IS NOT NULL)
);
INSERT INTO "new_Report" ("abstract", "authors", "expeditionId", "externalUrl", "id", "projectId", "publishedOn", "slug", "title", "type", "venue") SELECT "abstract", "authors", "expeditionId", "externalUrl", "id", "projectId", "publishedOn", "slug", "title", "type", "venue" FROM "Report";
DROP TABLE "Report";
ALTER TABLE "new_Report" RENAME TO "Report";
CREATE UNIQUE INDEX "Report_slug_key" ON "Report"("slug");
CREATE UNIQUE INDEX "Report_sourceSystem_sourceId_key" ON "Report"("sourceSystem", "sourceId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- FieldEntry review status (table not rebuilt here, so enforce with triggers)
CREATE TRIGGER "FieldEntry_review_valid_insert" BEFORE INSERT ON "FieldEntry"
WHEN NEW."reviewStatus" NOT IN ('pending', 'approved', 'rejected')
BEGIN SELECT RAISE(ABORT, 'FieldEntry.reviewStatus invalid'); END;
CREATE TRIGGER "FieldEntry_review_valid_update" BEFORE UPDATE OF "reviewStatus" ON "FieldEntry"
WHEN NEW."reviewStatus" NOT IN ('pending', 'approved', 'rejected')
BEGIN SELECT RAISE(ABORT, 'FieldEntry.reviewStatus invalid'); END;
