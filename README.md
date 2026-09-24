# Polar Stories: NCPOR Polar Science Outreach Portal

**SIH 2026 · Problem Statement 26063**: *Integrated Polar Science Outreach, Knowledge Repository and Media Dissemination Portal* for the National Centre for Polar and Ocean Research (NCPOR), Ministry of Earth Sciences.

> NCPOR already has the data. What's missing is the layer that makes it **discoverable, understandable, shareable, and capturable from the field**.

This is **not** a replacement for the [National Polar Data Center (NPDC)](https://npdc.ncaor.gov.in/). Dataset search stays there, and this portal links out to it. It is a public storytelling layer that sits on top of NCPOR's expedition reports, publications and media, plus a pipeline for capturing new content from stations with poor connectivity.

## What's in the prototype

| Feature | Where | What makes it real |
|---|---|---|
| **Map + timeline navigation** | `/explore` | Leaflet map with real station coordinates (Bharati, Maitri, Dakshin Gangotri, Himadri, Himansh, Sutri Dhaka). Clicking a pin highlights that station's expeditions on the timeline; clicking a timeline card moves the map to its station. State lives in the URL (`?station=bharati`), so views can be shared. |
| **Expedition Story mode** | `/expeditions/isea-43/story`, `/expeditions/arctic-2024/story` | 8 chapters (Why → What → Where → Who → Findings → Data → Publications → Photos). The chapter rail and sticky visual follow your scroll, and the map zooms to the station on "Where". |
| **AI "Explain simply" + social caption** | any `/reports/[slug]` | Student or general-public versions plus a ready-to-post caption. Every output is linked **in the database** to the exact report sections it used. Output that doesn't cite a real section is rejected, and a CHECK constraint makes it impossible to store AI text with no source. |
| **Offline-first field intake** | `/field` | Entries (with photos) are saved to IndexedDB first, then synced automatically on reconnect. A service worker lets the page open with **no network**. Uploads are idempotent (device-generated UUID), so retries never duplicate. |
| **Review before publishing** | `/admin` (passcode `ncpor2026`) | Field entries and AI drafts appear publicly only after approval. |

**Honesty note:** station names, locations and founding years are real. Expedition narratives, reports, figures and team members are **illustrative seeded data** standing in for a future NPDC / DSpace / expedition-report integration. The site footer says so too. Imagery is generated illustration (`scripts/gen-art.mjs`), not photographs; swap in real NCPOR media when you have it.

## Quick start

Requires **Node 20+** (tested on Node 24, Windows 11).

```powershell
npm install                 # also generates the Prisma client
npx prisma migrate deploy   # creates dev.db (SQLite) from the migrations
npm run seed                # loads 9 expeditions, 6 stations, 13 reports, 2 full stories
npm run dev                 # http://localhost:3000
```

On npm 11 you may be asked to approve install scripts for native packages. Run `npm approve-scripts better-sqlite3 prisma @prisma/engines esbuild` and then `npm rebuild`.

### Configuration (optional)

Everything works without a `.env` file. To enable live AI, copy `.env.example` to `.env` and set:

| Variable | Default | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | *(unset)* | Enables Claude for explanations and captions. **Without it, the offline summariser is used**: it only extracts and simplifies real sentences from the report, and still cites them. |
| `ANTHROPIC_MODEL` | `claude-opus-5` | Any Claude model ID, e.g. `claude-sonnet-5` for faster, cheaper output. |
| `AI_PROVIDER` | `claude` | Set to `mock` to force the offline summariser. |
| `ADMIN_PASSCODE` | `ncpor2026` | Passcode for `/admin`. |
| `DATABASE_URL` | `file:./dev.db` | SQLite file. |

If Claude is configured but unreachable during a demo, the app falls back to the offline summariser automatically and **says so** in the panel.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on :3000 |
| `npm run build` then `npm start` | Production build and server. **Use this for the offline demo**: the service worker only registers in production. |
| `npm test` | Unit tests (Vitest): citation validation, DB provenance constraints, offline sync engine, offline summariser |
| `npm run test:e2e` | Playwright against the dev server: offline queue, then reconnect and sync; full demo path |
| `npm run test:e2e:prod` | Builds, then runs Playwright against `next start`, adding the "reload while offline" service-worker test |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run demo:reset` | Reloads seed data and deletes uploaded photos. Run it before presenting. |
| `npm run db:reset` | Drops and recreates the database from migrations, then seeds it |
| `node scripts/gen-art.mjs` | Regenerates the illustration plates in `public/images/art/` |

First Playwright run: `npx playwright install chromium`.

## Demo script (about 6 minutes)

Run on a production build: `npm run build && npm start`.

1. **Home** → *Explore the map* → click **Bharati**. The panel shows the station, and its expeditions light up on the timeline.
2. Click **ISEA-43** → *Read the story*. Scroll through the chapters: the rail tracks progress, and on "Where we went" the map zooms to Prydz Bay.
3. At **Publications**, click *✦ Explain this simply* on the expedition report. Point out the **Based on §…** box. Click a section to jump to it in the original text, which is marked *cited*.
4. Toggle **Students ↔ General public**, then open **Social caption** → *Copy post*. The copied text includes the source line.
5. Open **Field app** (`/field`) once while online. Then, in DevTools → Network, choose **Offline** (or use airplane mode, or the "Simulate no connection" box). **Reload the page**: it still opens. Log an entry with a photo, and it shows *Waiting for connection*.
6. Go back **online**: the entry syncs by itself (*Synced · In NCPOR review*).
7. **Review** (`/admin`, passcode `ncpor2026`) → *Approve*. The note now appears on `/stations/bharati` under **Field notes**.

## Architecture

One Next.js 16 app (App Router, TypeScript) with API route handlers and a SQLite database accessed through Prisma 7.

```
prisma/
  schema.prisma            data model (Station, Expedition, StoryChapter, Project, Person,
                           Report → ReportSection, Media, DataProduct, FieldEntry,
                           AIContent → AIContentSource → ReportSection)
  migrations/              includes hand-written CHECK constraints for AI provenance
  seed.ts                  illustrative seed data
public/sw.js               service worker (scoped to the field app's page and static assets)
src/app/                   pages + API routes
  api/ai/generate          POST: generate or reuse explanation/caption, stored with citations
  api/field-entries        POST: idempotent multipart upload; GET ?ids= review status
  api/admin/review         PATCH: approve/reject (cookie-authenticated)
  api/uploads/[file]       serves field photos (uploads live in data/uploads, outside public/)
src/lib/ai/                provider interface, Claude provider, offline provider, prompts, citation validation
src/lib/offline/           IndexedDB queue (Dexie), sync engine, photo compression
src/components/            map, timeline, story, AI panel, field app, admin
tests/unit, tests/e2e
```

### How provenance is enforced

1. The report is sent to the model as **numbered sections**. The model must return structured JSON (`usedSections`), using Claude's structured-output mode.
2. The server maps those numbers to real `ReportSection` IDs and **rejects the output if none are valid** (`src/lib/ai/validate.ts`).
3. `AIContent` and its `AIContentSource` rows (one per cited section) are written in **one transaction**.
4. SQLite `CHECK` constraint: each `AIContent` row has **exactly one** source (a report or a field entry), backed by foreign keys. `tests/unit/provenance-constraint.test.ts` proves you can't insert unsourced AI text.
5. The citation shown in the UI and appended to copied captions is built from those rows, never from text the model wrote.

### How offline sync works

- Saving an entry writes to IndexedDB **first**, whether or not you're online. The photo is resized to 1600 px on the device.
- `syncAll()` uploads queued entries oldest first. It runs one sync at a time, and a network error stops the run and keeps entries queued. It retries server errors (5xx, 408, 429) but not permanent rejections (4xx).
- Sync triggers: page load, the browser `online` event, a 30-second timer, and the *Sync now* button.
- The server upserts on the device's UUID, so a sync that is repeated or interrupted can't create duplicates.
- The service worker caches `/field` (network-first) and `/_next/static` assets (cache-first). The page also tells the worker which assets it already loaded, so the first visit is enough to work offline.

**Phones on a LAN:** service workers need a secure context (`https://` or `localhost`). Over `http://<LAN-IP>`, the offline queue still works, but reloading while offline won't. For a phone demo, use an HTTPS tunnel or Chrome's "Insecure origins treated as secure" flag.

## Known limitations (prototype scope)

- A single shared review passcode, with no user accounts or roles.
- Search is plain `LIKE` matching across this portal's own content. Dataset search is NPDC's job.
- The map uses Web Mercator with a view per region. A polar stereographic projection would suit Antarctica better.
- Map tiles (Esri) and Google Fonts need internet the first time. Pins and content still render without tiles.
- The seed content is illustrative and not an NCPOR publication.
