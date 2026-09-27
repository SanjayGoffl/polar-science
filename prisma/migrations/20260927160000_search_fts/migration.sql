-- Full-text search index over stations, expeditions and report sections.
-- A standalone (non-external-content) FTS5 virtual table: `scripts/sync-sources.ts` deletes and
-- repopulates it on every sync, so it never drifts from the source-of-truth tables and needs no
-- triggers to stay in sync. `region` and `year` are UNINDEXED so they can be used as plain equality
-- filters alongside the MATCH query. Default `unicode61` tokenizer: FTS5's native `term*` prefix
-- queries cover "typo tolerant" partial/incomplete words; true fuzzy/misspelling correction would
-- need the `spellfix1` extension, which is not bundled with better-sqlite3.
CREATE VIRTUAL TABLE "SearchIndex" USING fts5(
  entityType UNINDEXED,
  entityId UNINDEXED,
  title,
  body,
  subtitle UNINDEXED,
  url UNINDEXED,
  region UNINDEXED,
  year UNINDEXED
);
