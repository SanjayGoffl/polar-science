# 04 · Final audit

Audit date: 26 September 2026.

## Changes in the final pass

**Content**
- Replaced all generated and illustrative content with official sources:
  - 11 PIB releases and parliament answers
  - 3 NCPOR station pages, plus one NCPOR news item used only for coordinates
  - 10 licensed photographs (GODL-India, CC BY-SA, public domain)
  - 17 verified NCPOR and NPDC resource links
- Removed the fictional people, projects, team rosters, statistics, data products and field notes, and the generated SVG art (`scripts/gen-art.mjs`).
- Rebuilt the three stories from verbatim, cited passages: ISEA-40, India in the Arctic, and the Chandra basin glaciers.

**Data pipeline**
- `import-sources.mjs` produces versioned snapshots with content hashes. `sync-sources.ts` loads them idempotently and refuses any quote that isn't verbatim.
- Natural-key deduplication and in-place updates (see 02-DATA).

**Schema**
- Squashed to one migration.
- Removed `Project`, `Person`, `ExpeditionMember` and `DataProduct`; added `Resource`, licensed `Media` and cited `StoryChapter`.
- Moved the integrity rules to triggers, so later table rebuilds can't drop them.
- The database file moved to `data/polar.db`.

**AI**
- OpenRouter primary (Gemma 4 31B, the strongest free JSON-capable model when checked), then `openrouter/free`, then optional Gemini (`gemini-flash-latest`), then the offline summariser.
- Renamed the "mock" provider to "offline".
- Kept the caching, context trimming, reviewer-only regeneration and rate limits.

**New features**
- Live station temperatures from NCPOR (home and station pages).
- A four-step first-visit tour.
- Official data portals on the home page.
- Station coordinates to the second, with elevation and data links.
- Official videos in the gallery once any are added (none yet).

**Security**
- `ADMIN_PASSCODE` is required in production; there is no default.
- Constant-time passcode checks, rate-limited login, magic-byte image checks, and private pending photos (these carry over from the previous pass).

## Tests (final run)

| Check | Result |
|---|---|
| `npm run typecheck` | clean |
| `npm test` (Vitest) | 48 passed, 7 files: source and editorial integrity (every quote verbatim, links official, media licensed and present), DB triggers, AI providers and fallback, offline summariser, offline sync engine, uploads and rate limits, live-weather parser |
| `npm run build` | succeeds |
| `npm run test:e2e:prod` (Playwright on `next start`) | 10 passed: full user journey, offline sync, offline reload (service worker), upload privacy and type checks, review API auth, reviewer edit, mobile story, mobile offline field app, mobile overflow on 9 pages, welcome tour |
| `npm run sources:sync` run twice | second run changes nothing (idempotent) |
| Code review (`/code-review low`) | 2 findings. One was a false positive (`Resource.title` exists). One was a minor `replace` → `replaceAll` issue, now fixed |

## Known gaps

**Content**
- **Coverage:** 12 timeline entries and 3 stories. Most expeditions (ISEA-2 to ISEA-39, ISEA-42, ISEA-44 onward, and most Arctic expeditions) have no official text imported yet. PIB coverage is uneven, and NCPOR's expedition reports are PDFs (no PDF importer yet).
- **Dakshin Gangotri:** coordinates not confirmed from an official source, so it is not on the map (timeline only).
- **Videos:** no official videos were verified, so none are included. The gallery supports YouTube once IDs are added to `media.json`.
- **Bharati photo:** the station exterior is public domain with an unknown author. The GODL-India ground-station photo is the attributable one.

**Live and external data**
- **Timestamps:** live temperatures are scraped from NCPOR's portal HTML. If the layout changes, the strip hides itself. Timestamps are shown as published (the portal doesn't state a timezone).
- **NPDC:** no live dataset integration yet. RAMADDA/NPDC could not be reached from the build environment, so datasets are linked, not imported.

**AI**
- **Live providers:** OpenRouter and Gemini output has not been exercised live because no key was configured. Tests mock the HTTP layer, and the real model IDs were verified against the OpenRouter model list.

**Platform and access**
- **Scaling:** rate limits are in-memory, so they apply per server instance. SQLite suits a single-server deployment.
- **Reviewer accounts:** there is one shared review passcode, with no per-reviewer accounts or audit trail of who approved what.
- **Phones on a LAN:** reloading the Field app offline needs HTTPS (or `localhost`).
