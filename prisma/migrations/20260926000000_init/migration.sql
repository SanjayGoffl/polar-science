-- CreateTable
CREATE TABLE "Station" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "established" TEXT,
    "elevation" TEXT,
    "location" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "liveKey" TEXT
);

-- CreateTable
CREATE TABLE "Expedition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'expedition',
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "number" INTEGER,
    "year" INTEGER NOT NULL,
    "season" TEXT,
    "region" TEXT NOT NULL,
    "stationId" TEXT,
    "summary" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "hasStory" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Expedition_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StoryChapter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "expeditionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sourceReportId" TEXT,
    "sourceSection" TEXT,
    "lat" REAL,
    "lng" REAL,
    "zoom" INTEGER,
    "mediaId" TEXT,
    CONSTRAINT "StoryChapter_expeditionId_fkey" FOREIGN KEY ("expeditionId") REFERENCES "Expedition" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StoryChapter_sourceReportId_fkey" FOREIGN KEY ("sourceReportId") REFERENCES "Report" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "expeditionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "publisher" TEXT NOT NULL,
    "authors" TEXT,
    "publishedOn" DATETIME NOT NULL,
    "abstract" TEXT NOT NULL,
    "externalUrl" TEXT NOT NULL,
    "contentStatus" TEXT NOT NULL DEFAULT 'official',
    "sourceSystem" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "retrievedAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Report_expeditionId_fkey" FOREIGN KEY ("expeditionId") REFERENCES "Expedition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReportSection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "number" TEXT NOT NULL,
    "heading" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    CONSTRAINT "ReportSection_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "altText" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "youtubeId" TEXT,
    "author" TEXT NOT NULL,
    "license" TEXT NOT NULL,
    "licenseUrl" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "stationId" TEXT,
    "expeditionId" TEXT,
    CONSTRAINT "Media_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Media_expeditionId_fkey" FOREIGN KEY ("expeditionId") REFERENCES "Expedition" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "publisher" TEXT NOT NULL,
    "stationId" TEXT,
    "expeditionId" TEXT,
    CONSTRAINT "Resource_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Resource_expeditionId_fkey" FOREIGN KEY ("expeditionId") REFERENCES "Expedition" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FieldEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stationId" TEXT NOT NULL,
    "activity" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "photoUrl" TEXT,
    "submittedBy" TEXT NOT NULL,
    "capturedAt" DATETIME NOT NULL,
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewStatus" TEXT NOT NULL DEFAULT 'pending',
    "reviewedAt" DATETIME,
    CONSTRAINT "FieldEntry_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AIContent" (
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
    "sourceHash" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "sourceReportId" TEXT,
    "sourceFieldEntryId" TEXT,
    CONSTRAINT "AIContent_sourceReportId_fkey" FOREIGN KEY ("sourceReportId") REFERENCES "Report" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AIContent_sourceFieldEntryId_fkey" FOREIGN KEY ("sourceFieldEntryId") REFERENCES "FieldEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AIContentSource" (
    "aiContentId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,

    PRIMARY KEY ("aiContentId", "sectionId"),
    CONSTRAINT "AIContentSource_aiContentId_fkey" FOREIGN KEY ("aiContentId") REFERENCES "AIContent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AIContentSource_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "ReportSection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Station_slug_key" ON "Station"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Expedition_slug_key" ON "Expedition"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Report_slug_key" ON "Report"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Report_sourceSystem_sourceId_key" ON "Report"("sourceSystem", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "ReportSection_reportId_number_key" ON "ReportSection"("reportId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Media_sourceUrl_key" ON "Media"("sourceUrl");

-- CreateIndex
CREATE UNIQUE INDEX "Resource_url_key" ON "Resource"("url");

-- CreateIndex
CREATE INDEX "FieldEntry_stationId_reviewStatus_idx" ON "FieldEntry"("stationId", "reviewStatus");

-- CreateIndex
CREATE INDEX "AIContent_sourceReportId_kind_audience_sourceHash_idx" ON "AIContent"("sourceReportId", "kind", "audience", "sourceHash");
-- ---------------------------------------------------------------------------
-- Hand-written integrity rules (Prisma cannot express CHECK constraints).
-- Implemented as triggers so they survive future table rebuilds by Prisma.
-- ---------------------------------------------------------------------------

-- Every AI output points at exactly one source (a document or a field entry).
CREATE TRIGGER "AIContent_source_insert" BEFORE INSERT ON "AIContent"
WHEN ((NEW."sourceReportId" IS NOT NULL) + (NEW."sourceFieldEntryId" IS NOT NULL)) <> 1
BEGIN SELECT RAISE(ABORT, 'AIContent must have exactly one source'); END;
CREATE TRIGGER "AIContent_source_update" BEFORE UPDATE OF "sourceReportId", "sourceFieldEntryId" ON "AIContent"
WHEN ((NEW."sourceReportId" IS NOT NULL) + (NEW."sourceFieldEntryId" IS NOT NULL)) <> 1
BEGIN SELECT RAISE(ABORT, 'AIContent must have exactly one source'); END;

CREATE TRIGGER "AIContent_values_insert" BEFORE INSERT ON "AIContent"
WHEN NEW."kind" NOT IN ('explanation', 'caption')
  OR NEW."reviewStatus" NOT IN ('pending', 'approved', 'rejected')
  OR NEW."provider" NOT IN ('openrouter', 'gemini', 'offline')
BEGIN SELECT RAISE(ABORT, 'AIContent kind, reviewStatus or provider invalid'); END;
CREATE TRIGGER "AIContent_values_update" BEFORE UPDATE OF "kind", "reviewStatus", "provider" ON "AIContent"
WHEN NEW."kind" NOT IN ('explanation', 'caption')
  OR NEW."reviewStatus" NOT IN ('pending', 'approved', 'rejected')
  OR NEW."provider" NOT IN ('openrouter', 'gemini', 'offline')
BEGIN SELECT RAISE(ABORT, 'AIContent kind, reviewStatus or provider invalid'); END;

-- Documents must say where they came from; official ones must link to it.
CREATE TRIGGER "Report_source_insert" BEFORE INSERT ON "Report"
WHEN NEW."contentStatus" NOT IN ('official', 'community') OR NEW."externalUrl" NOT LIKE 'http%'
BEGIN SELECT RAISE(ABORT, 'Report needs a valid contentStatus and an http(s) source URL'); END;
CREATE TRIGGER "Report_source_update" BEFORE UPDATE OF "contentStatus", "externalUrl" ON "Report"
WHEN NEW."contentStatus" NOT IN ('official', 'community') OR NEW."externalUrl" NOT LIKE 'http%'
BEGIN SELECT RAISE(ABORT, 'Report needs a valid contentStatus and an http(s) source URL'); END;

-- Field entry review status.
CREATE TRIGGER "FieldEntry_review_insert" BEFORE INSERT ON "FieldEntry"
WHEN NEW."reviewStatus" NOT IN ('pending', 'approved', 'rejected')
BEGIN SELECT RAISE(ABORT, 'FieldEntry.reviewStatus invalid'); END;
CREATE TRIGGER "FieldEntry_review_update" BEFORE UPDATE OF "reviewStatus" ON "FieldEntry"
WHEN NEW."reviewStatus" NOT IN ('pending', 'approved', 'rejected')
BEGIN SELECT RAISE(ABORT, 'FieldEntry.reviewStatus invalid'); END;

-- Media and resources must be attributable.
CREATE TRIGGER "Media_attribution_insert" BEFORE INSERT ON "Media"
WHEN NEW."kind" NOT IN ('photo', 'video') OR length(trim(NEW."author")) = 0 OR length(trim(NEW."license")) = 0
BEGIN SELECT RAISE(ABORT, 'Media needs kind photo|video, an author and a license'); END;
