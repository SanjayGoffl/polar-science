# 01 · Architecture

Polar Stories is a single Next.js 16 application (App Router, TypeScript, React 19) backed by SQLite through Prisma 7. There is no separate backend service: pages are server components that query the database directly, and the few mutations go through route handlers under `src/app/api`.

## Runtime components

| Part | Where | Responsibility |
|---|---|---|
| Pages | `src/app/**/page.tsx` | Server-rendered: home, explore, stories, story, expedition, station, report, search, field, admin |
| API | `src/app/api/*` | `ai/generate` (explain/caption), `field-entries` (offline sync), `admin/review` (approve/reject/edit), `uploads/[file]` (field photos) |
| Database | `data/polar.db` (SQLite) | Schema in `prisma/schema.prisma`, one migration in `prisma/migrations`, integrity rules as SQL triggers |
| Source pipeline | `scripts/import-sources.mjs`, `scripts/sync-sources.ts`, `src/lib/sources/*` | Import official documents as verbatim snapshots, then load them idempotently into the database. See 02-DATA |
| AI | `src/lib/ai/*` | Provider chain (OpenRouter, then Gemini, then the offline summariser), JSON validation, citation checks, caching |
| Offline field app | `src/components/field`, `src/lib/offline`, `public/sw.js` | IndexedDB queue (Dexie), sync engine, service worker for offline page loads |
| Live weather | `src/lib/liveWeather.ts` | Reads current temperatures from NCPOR's data portal (15-minute cache); fails quietly |
| Map and timeline | `src/components/map`, `src/components/timeline`, `src/components/explore` | Leaflet map (Esri light-grey tiles), a timeline linked to the map, URL-synced state |
| Share cards | `src/app/**/opengraph-image.tsx`, `src/lib/og.tsx` | Open Graph images for stations, expeditions, stories and reports, rendered with Next.js `ImageResponse`; each shows the title, one verbatim quote already stored in the database, and the source line — no invented text |
| Printable handouts | `@media print` rules in `src/app/globals.css`, the print-only masthead and "Print / save as PDF" button in `src/components/story/StoryView.tsx` | Story pages print as one plain column of the chapter text and citations, with the interactive cover, sticky rail, sticky visual panel and site header hidden |

## AI design

- **Chain:** set by `AI_PROVIDER` (default `openrouter`).
  - OpenRouter tries `OPENROUTER_MODEL` (default `google/gemma-4-31b-it:free`), then `OPENROUTER_FALLBACK_MODEL` (default `openrouter/free`).
  - Gemini (`GEMINI_MODEL`, default `gemini-flash-latest`) runs only if `GEMINI_API_KEY` is set.
  - The offline summariser (`src/lib/ai/offline.ts`) always comes last.
  - Providers without a key are skipped. Clients are plain `fetch`, with no SDK.
- **Why these models:** Gemma 4 31B was the strongest free model on OpenRouter with JSON-mode support when checked (September 2026). `openrouter/free` routes to whichever free model is available. Gemini is optional, as an independent quota.
- **Grounding:**
  - The model receives the document as numbered sections and must return JSON that names the sections it used (`usedSections`).
  - `src/lib/ai/validate.ts` maps those numbers to real section rows and rejects output that cites none.
  - The row and its `AIContentSource` links are written in one transaction.
- **Language:**
  - The reader can ask for the plain-language explanation in English or Hindi (Devanagari). The choice is sent as `language` on `POST /api/ai/generate` and cached separately (`AIContent.language`, default `"en"`), so a Hindi draft and an English draft of the same document sit side by side, each reviewed independently.
  - Hosted providers (OpenRouter, Gemini) are instructed to reply in Hindi; the offline summariser is extractive from the English source text and can't translate, so it's skipped for `language: "hi"` (`AIProvider.supportsLanguage`). If no provider in the chain supports the requested language, generation fails with a clear error instead of silently returning English text mislabelled as Hindi.
- **Token economy:**
  - Output is cached per document, kind, audience and source hash. The cache serves approved versions first.
  - Identical simultaneous requests share one call.
  - Captions only receive the intro plus the most relevant sections (chosen deterministically), section text is trimmed to 1,500 characters, and output is capped at 900 or 300 tokens.
  - Only reviewers can force a regeneration, and generation is rate-limited per client.
- **Human review:**
  - Every AI output starts as `pending`, and the public panel labels it "AI draft · awaiting review".
  - Reviewers can edit the wording (citations stay attached, and `editedByReviewer` is set), then approve or reject it.
  - Rejected drafts are never served.

## Offline field app

1. Saving always writes to IndexedDB first. The photo is resized on the device to 1600 px, plus a 240 px thumbnail.
2. `syncAll()` uploads the oldest entries first, running one sync at a time.
   - A network error stops the run and leaves entries queued.
   - Errors 5xx, 408 and 429 are retried. Other 4xx errors mark the entry as rejected.
3. Sync triggers: page load, the `online` event, a 30-second timer, and **Sync now**.
4. The server upserts on the device-generated UUID. It also treats the same note, from the same person at the same station, within a minute, as a duplicate.
5. `public/sw.js` caches `/field` (network-first) and hashed static assets (cache-first). The page tells the worker which assets it already loaded, so one online visit is enough.
6. After upload, the full photo is deleted from the device and the thumbnail is kept.

## Security

- **Review desk:**
  - The passcode comes from `ADMIN_PASSCODE`, which is required in production. The desk is locked when it's unset.
  - The cookie holds a SHA-256 of the passcode (httpOnly, SameSite=Lax) and is compared in constant time.
  - Login is rate-limited.
- **Uploads:**
  - Images are checked by their magic bytes (JPEG, PNG or WebP only) and capped at 8 MB.
  - Files are stored outside `public/`, in `data/uploads`.
  - A photo is served publicly only after its entry is approved. Reviewers can always see it.
- **Input:**
  - Control characters are stripped and field lengths are capped.
  - `capturedAt` can't be set in the future.
  - The review API validates its input and requires the reviewer cookie.
- **Headers:** `nosniff`, `Referrer-Policy`, `X-Frame-Options: SAMEORIGIN`, a `Permissions-Policy` that allows only the camera, and no `x-powered-by`.
- **Secrets:** API keys live only in `.env` (gitignored) and are read server-side.

## Rate limits (in-memory, per client IP)

| Route | Limit |
|---|---|
| AI generation | 40 per 10 min for the public, 100 for reviewers |
| Field uploads | 120 per 10 min |
| Review login | 10 attempts per 10 min |

## Directory map

```
data/sources/        official snapshots (pib/, ncpor/), registry.json, editorial.json, media.json
data/polar.db        SQLite database (gitignored)
data/uploads/        field photos (gitignored)
prisma/              schema.prisma, migrations/ (tables + integrity triggers)
public/images/photos licensed photos, mirrored with attribution in media.json
public/sw.js         service worker for the Field app
scripts/             import-sources.mjs, sync-sources.ts, clear-uploads.mjs
src/app/             pages and API routes
src/components/      UI (ai, admin, explore, field, map, story, timeline, WelcomeTour)
src/lib/             ai/, offline/, sources/, db, queries, liveWeather, rateLimit, admin, uploads
tests/unit, tests/e2e
```
