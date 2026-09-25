# Polar Stories: NCPOR Polar Science Outreach Portal

**SIH 2026 · Problem Statement 26063**: *Integrated Polar Science Outreach, Knowledge Repository and Media Dissemination Portal* for the National Centre for Polar and Ocean Research (NCPOR), Ministry of Earth Sciences.

> NCPOR already has the data. What's missing is the layer that makes it **discoverable, understandable, shareable, and capturable from the field**.

This is **not** a replacement for the [National Polar Data Center (NPDC)](https://npdc.ncaor.gov.in/). Dataset search stays there, and this portal links out to it. It is a public storytelling layer that sits on top of NCPOR's expedition reports, publications and media, plus a pipeline for capturing new content from stations with poor connectivity.

## What's in the prototype

| Feature | Where | What makes it real |
|---|---|---|
| **Map + timeline navigation** | `/explore` | Leaflet map with real station coordinates (Bharati, Maitri, Dakshin Gangotri, Himadri, Himansh, Sutri Dhaka). Clicking a pin highlights that station's expeditions on the timeline; clicking a timeline card moves the map to its station. State lives in the URL (`?station=bharati`), so views can be shared. |
| **Expedition Story mode** | `/stories`, `/expeditions/isea-43/story`, `/expeditions/arctic-2024/story` | 8 chapters (Why → What → Where → Who → Findings → Data → Publications → Photos). The chapter rail and sticky visual follow your scroll, and the map zooms to the station on "Where". |
| **AI "Explain simply" + social caption** | any `/reports/[slug]` | Student or general-public versions plus a ready-to-post caption. Every output is linked **in the database** to the exact report sections it used. Output that doesn't cite a real section is rejected, and a CHECK constraint makes it impossible to store AI text with no source. |
| **Human review** | `/admin` | AI drafts and field entries are labelled *awaiting review* until a reviewer approves them. Reviewers can correct AI wording (the citations stay attached, and the edit is recorded). Approved versions are served first. |
| **Offline-first field intake** | `/field` | Entries (with photos) are saved to IndexedDB first, then synced automatically on reconnect. A service worker lets the page open with **no network**. Uploads are idempotent (device-generated UUID, plus a content-level duplicate check), so retries never duplicate. |
| **Search** | `/search` | Stations, expeditions, report sections and published field notes. Dataset search is NPDC's job. |

### Official vs illustrative content

Station names, locations and founding years are real public facts, and each station links to NCPOR. **Everything else in the seed (expedition narratives, reports, figures, people) is illustrative sample data** standing in for a future NPDC / DSpace / expedition-report integration. It is never presented as NCPOR findings:

- `Report.contentStatus` and `Expedition.contentStatus` are `illustrative` or `official`. A database CHECK constraint requires official reports to carry a source URL (`externalUrl`).
- Illustrative stories, reports and expeditions show an **Illustrative sample** notice with links to the real NCPOR and NPDC sites.
- AI output built on an illustrative source says so in the panel, and **copied social posts carry an "Illustrative sample content, not an official NCPOR finding" line**.
- `Report.sourceSystem` and `Report.sourceId` are unique together, so a future NPDC or DSpace importer can upsert records without creating duplicates. No importer is included yet.

Imagery is generated illustration (`scripts/gen-art.mjs`), not photographs.

## Quick start

Requires **Node 20+** (tested on Node 24, Windows 11).

```powershell
npm install                 # also generates the Prisma client
npx prisma migrate deploy   # creates dev.db (SQLite) from the migrations
npm run seed                # 9 expeditions, 6 stations, 13 reports, 2 full stories
npm run build; npm start    # http://localhost:3000 (production build: needed for the offline service worker)
```

On npm 11 you may be asked to approve install scripts for native packages: `npm approve-scripts better-sqlite3 prisma @prisma/engines esbuild`, then `npm rebuild`.

## AI setup

Copy `.env.example` to `.env` (a blank `.env` skeleton is included locally and is gitignored). **With no keys, everything still works** using the offline summariser.

| Variable | Default | Purpose |
|---|---|---|
| `AI_PROVIDER` | `openrouter` | `openrouter`, `gemini` or `mock` (offline only) |
| `OPENROUTER_API_KEY` | *(empty)* | Key from [openrouter.ai/keys](https://openrouter.ai/keys) |
| `OPENROUTER_MODEL` | `google/gemma-4-31b-it:free` | Primary model |
| `OPENROUTER_FALLBACK_MODEL` | `openrouter/free` | Tried if the primary is rate-limited, down, or replies with unusable JSON |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | *(empty)* / `gemini-2.5-flash` | Optional extra fallback, or primary with `AI_PROVIDER=gemini` |
| `ADMIN_PASSCODE` | `ncpor2026` when empty | Review desk passcode. **Set it for any shared deployment.** |
| `DATABASE_URL` | `file:./dev.db` | SQLite file |

**Fallback chain:** OpenRouter primary model, then the OpenRouter fallback model, then Gemini (if keyed), then the offline summariser. Providers without a key are skipped. If the chain falls through to the offline summariser, the panel says so. The offline summariser only extracts and simplifies real sentences from the report and still cites them.

**Keeping API usage low:**
- Outputs are cached in the database per report, output type and audience, keyed by a hash of the source text. They are reused until the report changes.
- Reviewer-approved versions are served first.
- Identical simultaneous requests share one call.
- Captions receive only the intro and the likeliest findings sections, chosen deterministically.
- Section text is trimmed, and output length is capped (about 900 tokens for explanations, 300 for captions).
- **Regenerate** is reviewer-only, and generation is rate-limited per client.
- No SDKs: both APIs are called with `fetch`.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on :3000 |
| `npm run build` then `npm start` | Production build and server (use this for demos) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit tests (Vitest): citation validation, DB constraints, AI providers and fallback, offline sync engine, offline summariser, upload sniffing, rate limiting |
| `npm run test:e2e` | Playwright against the dev server |
| `npm run test:e2e:prod` | Builds, then runs Playwright against `next start`: demo path, offline reload and sync, upload privacy, reviewer edits, mobile layouts |
| `npm run demo:reset` | Reloads seed data and deletes uploaded photos. **Run it before presenting.** |
| `npm run db:reset` | Drops and recreates the database from migrations, then seeds it |
| `node scripts/gen-art.mjs` | Regenerates the illustration plates |

First Playwright run: `npx playwright install chromium`.

## Demo script (about 6 minutes)

Run `npm run demo:reset`, then `npm run build && npm start`.

1. **Home** → *Explore the map* → click the **Bharati** pin. The panel shows the station, and its expeditions light up on the timeline.
2. Click **ISEA-43** → *Read the story*. Point out the *Illustrative sample* notice. Scroll through the chapters: the rail tracks progress, and on "Where we went" the map zooms to Prydz Bay.
3. At **Publications**, click *✦ Explain this simply*. Point out the **Based on §…** box. Click a section to jump to it in the original, which is marked *cited*.
4. Toggle **Students ↔ General public**, then open **Social caption** → *Copy post*. The copied text includes the source line and the illustrative-content note.
5. Open **Field app** (`/field`) once while online. Go offline (DevTools → Network → Offline, airplane mode, or the "Simulate no connection" box). **Reload**: the page still opens. Log an entry with a photo, and it shows *Waiting for connection*.
6. Go back **online**: the entry syncs by itself (*Synced · In NCPOR review*).
7. **Review** (`/admin`, passcode `ncpor2026`): *Edit* an AI draft if you like, then *Approve* the field note. It now appears on `/stations/bharati` under **Field notes**, and its photo becomes public.

## Architecture

One Next.js 16 app (App Router, TypeScript) with API route handlers and SQLite through Prisma 7.

```
prisma/
  schema.prisma            Station, Expedition, StoryChapter, Project, Person, Report → ReportSection,
                           Media, DataProduct, FieldEntry, AIContent → AIContentSource → ReportSection
  migrations/              includes hand-written CHECK constraints and triggers (provenance, statuses)
  seed.ts                  illustrative seed data
public/sw.js               service worker (field app page + static assets only)
src/app/api/
  ai/generate              POST: cached or new explanation/caption with citations (regenerate: reviewers only)
  field-entries            POST: idempotent multipart upload (magic-byte image check); GET ?ids= review status
  admin/review             PATCH: approve/reject/reopen, optional reviewer edit of AI text
  uploads/[file]           field photos: public once approved, reviewers only before that
src/lib/ai/                llm.ts (OpenRouter + Gemini over fetch), structured.ts (JSON validation + model fallback),
                           mock.ts (offline summariser), prompts.ts, validate.ts (citations), index.ts (chain + cache)
src/lib/offline/           IndexedDB queue (Dexie), sync engine, photo compression
src/lib/rateLimit.ts       per-client sliding-window limits (AI, uploads, admin login)
```

### How provenance is enforced

1. The report is sent as **numbered sections**. The model must return JSON with `usedSections`.
2. The server maps those numbers to real `ReportSection` rows and **rejects the output if none are valid**. The next model or provider then gets a turn.
3. `AIContent` and one `AIContentSource` row per cited section are written in a single transaction, with the source hash and prompt version.
4. SQLite CHECK: each `AIContent` row has **exactly one** source (a report or a field entry), backed by foreign keys.
5. Citations shown in the UI and appended to copied posts are built from those rows, never from model-written text.

### How offline sync works

- Saving writes to IndexedDB **first**, online or not. Photos are resized to 1600 px, with a 240 px thumbnail. The full photo is dropped from the device once it's uploaded.
- `syncAll()` uploads oldest first and runs one sync at a time. A network error stops the run and keeps entries queued. It retries 5xx, 408 and 429, but not permanent 4xx rejections.
- Sync triggers: page load, the `online` event, a 30-second timer, and *Sync now*.
- The server upserts on the device UUID, and also treats the same note, author and station within a minute as a duplicate.
- The service worker caches `/field` (network-first) and hashed static assets (cache-first). The page reports the assets it already loaded, so the first visit is enough to work offline.

**Phones on a LAN:** service workers need `https://` or `localhost`. Over `http://<LAN-IP>` the offline queue works, but reloading while offline doesn't. Use an HTTPS tunnel for phone demos.

### Security notes

- Review cookie: an httpOnly hash of the passcode, compared in constant time. Login is rate-limited.
- Uploads: type is checked by magic bytes (JPEG, PNG, WebP), capped at 8 MB, and stored outside `public/`. Pending photos are not publicly readable.
- Headers: `nosniff`, `Referrer-Policy`, `X-Frame-Options`, and a `Permissions-Policy` that allows only the camera.
- API keys stay in `.env` (gitignored) and are used only on the server.

## Known limitations

- A single shared review passcode, with no user accounts or roles. The rate limiter is in-memory, so it's per server instance only.
- Search is plain `LIKE` matching across this portal's own content.
- The map uses Web Mercator with a view per region, not a polar projection.
- Map tiles (Esri) and Google Fonts need internet the first time. Pins and content still render without tiles.
- There are no official NCPOR documents in the seed yet. The official path (content status plus source URL plus import IDs) exists but is empty.
- Free OpenRouter models are rate-limited and can be slow. The cache and fallback chain absorb this, but first-time generation may take several seconds.
