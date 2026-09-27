# 02 · Data

All public content comes from official sources, and is shown verbatim with a link to the original. Nothing is generated or invented. The only non-source content is:
- editorial labels, such as chapter titles and region names
- field entries submitted by users (published only after review)
- AI explanations, which are drafts labelled as such until reviewed and always cite their sections

## Sources

| System | What | Where it is stored |
|---|---|---|
| `pib` | Press Information Bureau (Government of India) releases and answers to Parliament questions from the Ministry of Earth Sciences | `data/sources/pib/<PRID or r<relid>>.json` |
| `ncpor` | NCPOR station pages (Maitri, Himadri, Himansh) and one NCPOR news item that gives Bharati's and Maitri's coordinates | `data/sources/ncpor/<id>.json` |
| Wikimedia Commons | Licensed photographs (GODL-India, CC BY-SA, public domain), each with author, licence and file page | `data/sources/media.json` + `public/images/photos/` |
| NCPOR / NPDC portals | Links to live weather, datasets and data portals, each checked for HTTP 200 when added | `resources` in `data/sources/editorial.json` |
| NCPOR live weather | Current air temperature at the four stations, read at request time and cached for 15 min | not stored |

Each snapshot records `sourceSystem`, `sourceId`, `url`, `retrievedAt`, `contentHash`, `publisher`, `organisation`, `title`, `publishedOn` and `paragraphs` (verbatim text).

## Pipeline

```
official site ──import-sources.mjs──▶ data/sources/<system>/<id>.json ──sync-sources.ts──▶ SQLite
                 (network, on demand)   (versioned in git, reviewable)     (no network, idempotent)
```

1. **Import:** `npm run sources:fetch`, or add one document with `node scripts/import-sources.mjs pib:<PRID>`, `pib:r<relid>`, or `ncpor:<id>=<url>`.
   - The script fetches the page and extracts the paragraphs, dropping sign-offs, captions and site chrome.
   - It rewrites the snapshot only if the content hash changed.
   - It retries flaky connections, and follows PIB's cookie redirect.
2. **Curate:** `data/sources/editorial.json` maps the sources onto the site:
   - stations
   - timeline entries (expeditions, programmes, milestones)
   - which documents belong to which entry
   - story chapters
   - resources
   - document types
3. **Sync:** `npm run sources:sync`.
   - Paragraphs become numbered sections (`src/lib/sources/sections.ts`). List items join the paragraph that introduces them, and headings are the section's own opening words.
   - Every quoted passage in the editorial file must appear verbatim in the named section, or the sync stops with an error.
   - Rows are upserted on natural keys, so re-running changes nothing.
   - The full-text search index (`SearchIndex`, a SQLite FTS5 virtual table, see `prisma/migrations/20260927160000_search_fts`) is deleted and rebuilt every sync from the same station, expedition and report-section rows, so it never drifts. Search matches use FTS5's native `term*` prefix matching (the default `unicode61` tokenizer); true misspelling correction would need the `spellfix1` extension, which isn't bundled with `better-sqlite3`, so it's out of scope for now.

## Deduplication and updates

| Entity | Natural key | Behaviour on re-sync |
|---|---|---|
| Station | `slug` | updated in place; never deleted while it has field entries |
| Timeline entry | `slug` | updated in place; removed if dropped from the editorial file |
| Document | `(sourceSystem, sourceId)` (unique) | updated in place; sections upserted by `(reportId, number)` so citation links stay stable |
| Media | `sourceUrl` (unique) | updated in place |
| Resource | `url` (unique) | updated in place |
| Story chapter | `(entry, order)` | rebuilt for each story |
| Field entry | device UUID, plus a content check (same station, author and note within 60 s) | never touched by sync |
| AI output | tied to a `sourceHash` of the document text | kept; if the text changes, the hash no longer matches and new output is generated on the next request |

## Data model (key tables)

- **Station:** slug, region, kind, coordinates, established, elevation, location, `description` (a verbatim quote), `sourceUrl`, `liveKey`.
- **Expedition** (timeline entry): `kind` is expedition, programme or milestone; year, season, region, an optional station, `summary` (verbatim quote), `sourceUrl`, `featured`, `hasStory`.
- **Report** (source document): type (press release, parliament answer or station profile), publisher, `publishedOn`, `externalUrl`, `contentStatus` (official), `sourceSystem`/`sourceId`, `contentHash`, `retrievedAt`. Its **ReportSection** rows hold the numbered verbatim sections.
- **StoryChapter:** kind (why, what, where, who, found, data, publications or media), an editorial title, `body` (verbatim quote), `sourceReportId` + `sourceSection` (the citation), map focus, and `mediaId`.
- **Media:** kind, url, `author`, `license`, `licenseUrl`, `sourceUrl`, linked to a station or entry.
- **Resource:** title, url, kind (live data, dataset or portal), publisher, linked to a station or entry.
- **FieldEntry:** device UUID, station, activity, notes, photo, author, capture time, review status.
- **AIContent** and **AIContentSource:** generated text, provider, model, prompt version, source hash, review status, and the exact sections it cites.

## Integrity rules (SQL triggers in the migration)

- An AI output must have **exactly one** source (a document or a field entry), and it can't be detached from that source later.
- AI `kind`, `reviewStatus` and `provider` must be valid values.
- A document must have status `official` or `community`, and an `http(s)` source URL.
- A field entry's review status must be pending, approved or rejected.
- Media must have an author and a licence.

## Current holdings

| Content | Details |
|---|---|
| Stations (4) | Maitri, Bharati, Himadri, Himansh |
| Timeline entries (12) | ISEA-1 (1981), Dakshin Gangotri (1983), Maitri (1988), Arctic programme (2007), Himadri (2008), Bharati (2012), Chandra basin programme (2013), Himansh (2016), ISEA-40, ISEA-41, ISEA-43, first Arctic winter expedition (2023) |
| Documents (14) | 11 PIB, 3 NCPOR station pages (Maitri, Himadri, Himansh). One more NCPOR snapshot (a 2018 news item) is kept only as the source of Bharati's coordinates; Himadri's coordinates cite PIB release 2088842 by URL |
| Stories (3) | ISEA-40, India in the Arctic, Chandra basin glaciers |
| Photos (10) | licensed |
| Official resources (17) | live data, datasets and portals |

**Not included:**
- **Dakshin Gangotri on the map:** its coordinates were not confirmed from an official source, so it appears on the timeline only.
- **Videos:** none were verified from official channels.
- **Named team rosters:** these appear only where a source names people, for example ISEA-40's winter team leaders.

## Adding content

1. Import the document: `node scripts/import-sources.mjs pib:<PRID>`.
2. Attach it to an entry in `editorial.json` (a `documents` list), or create a new entry with a verbatim `summary` quote.
3. Optionally add story chapters that quote its sections.
4. Run `npm run sources:sync`, then `npm test`. The editorial integrity tests check every quote, link and licence.
