-- Add a real foreign key from StoryChapter.mediaId to Media(id), matching every other
-- relation in the schema. SQLite has no ALTER TABLE ADD CONSTRAINT, so the table is rebuilt.
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_StoryChapter" (
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
    CONSTRAINT "StoryChapter_sourceReportId_fkey" FOREIGN KEY ("sourceReportId") REFERENCES "Report" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StoryChapter_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_StoryChapter" ("id", "expeditionId", "order", "kind", "title", "body", "sourceReportId", "sourceSection", "lat", "lng", "zoom", "mediaId")
SELECT "id", "expeditionId", "order", "kind", "title", "body", "sourceReportId", "sourceSection", "lat", "lng", "zoom", "mediaId" FROM "StoryChapter";
DROP TABLE "StoryChapter";
ALTER TABLE "new_StoryChapter" RENAME TO "StoryChapter";

PRAGMA foreign_keys=ON;
