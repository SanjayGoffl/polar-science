-- CreateTable
CREATE TABLE "Station" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "established" INTEGER,
    "location" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "heroImage" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Expedition" (
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
    "hasStory" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Expedition_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StoryChapter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "expeditionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "eyebrow" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "lat" REAL,
    "lng" REAL,
    "zoom" INTEGER,
    "image" TEXT,
    "stats" TEXT,
    CONSTRAINT "StoryChapter_expeditionId_fkey" FOREIGN KEY ("expeditionId") REFERENCES "Expedition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "expeditionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "lead" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    CONSTRAINT "Project_expeditionId_fkey" FOREIGN KEY ("expeditionId") REFERENCES "Expedition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "expertise" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "ExpeditionMember" (
    "expeditionId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "role" TEXT NOT NULL,

    PRIMARY KEY ("expeditionId", "personId"),
    CONSTRAINT "ExpeditionMember_expeditionId_fkey" FOREIGN KEY ("expeditionId") REFERENCES "Expedition" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExpeditionMember_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Report" (
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
    CONSTRAINT "Report_expeditionId_fkey" FOREIGN KEY ("expeditionId") REFERENCES "Expedition" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Report_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
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
    "expeditionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "altText" TEXT NOT NULL,
    "credit" TEXT NOT NULL,
    CONSTRAINT "Media_expeditionId_fkey" FOREIGN KEY ("expeditionId") REFERENCES "Expedition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DataProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "expeditionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "parameter" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "volume" TEXT NOT NULL,
    "npdcUrl" TEXT NOT NULL,
    CONSTRAINT "DataProduct_expeditionId_fkey" FOREIGN KEY ("expeditionId") REFERENCES "Expedition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "sourceReportId" TEXT,
    "sourceFieldEntryId" TEXT,
    CONSTRAINT "AIContent_sourceReportId_fkey" FOREIGN KEY ("sourceReportId") REFERENCES "Report" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AIContent_sourceFieldEntryId_fkey" FOREIGN KEY ("sourceFieldEntryId") REFERENCES "FieldEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    -- Provenance guard: exactly one source must be set (added by hand; Prisma cannot express CHECK)
    CONSTRAINT "AIContent_exactly_one_source" CHECK ((("sourceReportId" IS NOT NULL) + ("sourceFieldEntryId" IS NOT NULL)) = 1),
    CONSTRAINT "AIContent_kind_valid" CHECK ("kind" IN ('explanation', 'caption')),
    CONSTRAINT "AIContent_review_valid" CHECK ("reviewStatus" IN ('pending', 'approved', 'rejected'))
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
CREATE INDEX "AIContent_sourceReportId_kind_audience_idx" ON "AIContent"("sourceReportId", "kind", "audience");
