# Polar Stories

An outreach guide to India's polar and Himalayan research by the National Centre for Polar and Ocean Research (NCPOR), Ministry of Earth Sciences. Built for Smart India Hackathon problem statement 26063 (Integrated Polar Science Outreach, Knowledge Repository and Media Dissemination Portal).

- **Explore** stations on a map and expeditions on a timeline.
- **Read stories** that quote official records chapter by chapter, with a citation on every passage.
- **Explain simply:** plain-language versions for students or the public, plus social posts. Each one cites the exact sections it used, and a reviewer approves it before it counts as final.
- **Field app:** log notes and photos at a station with no connection. They sync automatically and are published after review.
- **Live conditions** at Maitri, Bharati, Himadri and Himansh, from NCPOR's data portal.

All content is quoted from official sources (Press Information Bureau releases and NCPOR pages), with a link to each original. Photos are licensed (GODL-India, CC BY-SA, public domain) and credited. Datasets stay at the [National Polar Data Center](https://npdc.ncpor.res.in/npdc/homepage.action). This site links to them.

## Quick start

Requires Node 20+ (tested on Node 24).

```bash
npm install
cp .env.example .env         # optional: add OPENROUTER_API_KEY; set ADMIN_PASSCODE for production
npm run db:setup             # create data/polar.db and load the official sources
npm run build && npm start   # http://localhost:3000
```

On npm 11, approve the native install scripts once: `npm approve-scripts better-sqlite3 prisma @prisma/engines esbuild`, then run `npm rebuild`.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build`, `npm start` | Production build and server (the offline service worker is active only here) |
| `npm run typecheck` | TypeScript check |
| `npm test` | Unit tests: data integrity, provenance triggers, AI providers, offline sync, security helpers |
| `npm run test:e2e:prod` | Build, then run the Playwright user-flow tests against `next start` |
| `npm run db:setup` | Apply migrations and load sources (safe to re-run) |
| `npm run sources:fetch` | Re-download official source snapshots (only rewrites the ones that changed) |
| `npm run sources:sync` | Load snapshots into the database (idempotent; never touches field entries) |
| `npm run db:reset` | Wipe and rebuild the database, and delete uploaded photos |

First e2e run: `npx playwright install chromium`.

## AI configuration

With no keys set, the offline summariser is used. It extracts and simplifies real sentences, and still cites them.

- **Order:** OpenRouter `google/gemma-4-31b-it:free`, then `openrouter/free`, then Gemini (optional), then the offline summariser.
- **Caching:** outputs are cached per document, audience and language until the document text changes.
- **Language:** the plain-language summary can be generated in English or Hindi (हिंदी), on request, from the report page. Hindi needs a live provider (OpenRouter or Gemini) — the offline summariser is English-only.

The details are in `docs/01-ARCHITECTURE.md`.

## Documentation

- [`docs/01-ARCHITECTURE.md`](docs/01-ARCHITECTURE.md): components, AI design, offline sync, security
- [`docs/02-DATA.md`](docs/02-DATA.md): sources, import and sync pipeline, deduplication, data model, how to add content
- [`docs/03-USER-FLOWS.md`](docs/03-USER-FLOWS.md): every user journey and the test that covers it
- [`docs/04-FINAL-AUDIT.md`](docs/04-FINAL-AUDIT.md): what was checked, test results and known gaps
