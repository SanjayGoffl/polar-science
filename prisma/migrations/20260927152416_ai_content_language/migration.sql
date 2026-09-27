-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AIContent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
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
INSERT INTO "new_AIContent" ("audience", "editedByReviewer", "generatedAt", "id", "kind", "model", "promptVersion", "provider", "reviewStatus", "reviewedAt", "sourceFieldEntryId", "sourceHash", "sourceReportId", "text") SELECT "audience", "editedByReviewer", "generatedAt", "id", "kind", "model", "promptVersion", "provider", "reviewStatus", "reviewedAt", "sourceFieldEntryId", "sourceHash", "sourceReportId", "text" FROM "AIContent";
DROP TABLE "AIContent";
ALTER TABLE "new_AIContent" RENAME TO "AIContent";
CREATE INDEX "AIContent_sourceReportId_kind_audience_language_sourceHash_idx" ON "AIContent"("sourceReportId", "kind", "audience", "language", "sourceHash");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Re-create the integrity triggers dropped by the table rebuild above (see 20260926000000_init).
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
  OR NEW."language" NOT IN ('en', 'hi')
BEGIN SELECT RAISE(ABORT, 'AIContent kind, reviewStatus, provider or language invalid'); END;
CREATE TRIGGER "AIContent_values_update" BEFORE UPDATE OF "kind", "reviewStatus", "provider", "language" ON "AIContent"
WHEN NEW."kind" NOT IN ('explanation', 'caption')
  OR NEW."reviewStatus" NOT IN ('pending', 'approved', 'rejected')
  OR NEW."provider" NOT IN ('openrouter', 'gemini', 'offline')
  OR NEW."language" NOT IN ('en', 'hi')
BEGIN SELECT RAISE(ABORT, 'AIContent kind, reviewStatus, provider or language invalid'); END;
