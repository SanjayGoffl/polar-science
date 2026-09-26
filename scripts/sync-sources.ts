/**
 * Source sync: loads official source snapshots (data/sources) into the database.
 *
 *   npm run sources:sync
 *
 * - Idempotent: rows are matched on natural keys (station slug, entry slug, source system + id,
 *   media source URL, resource URL) and updated in place. Running it twice changes nothing.
 * - Verifiable: every summary and story chapter in data/sources/editorial.json must be an exact
 *   passage of its source document, or the sync stops with an error.
 * - Non-destructive for people's work: field entries are never touched. AI outputs survive a
 *   sync; if a document's text changed, their source hash no longer matches and they regenerate.
 */
import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { loadEditorial } from "../src/lib/sources/editorial";
import { loadSnapshots, resolveQuote, slugify } from "../src/lib/sources/snapshots";

const db = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || "file:./data/polar.db" }),
});

async function main() {
  const docs = loadSnapshots();
  const ed = loadEditorial();
  const counts = { stations: 0, entries: 0, documents: 0, sections: 0, chapters: 0, media: 0, resources: 0, removed: 0 };

  // Stations
  const stationIds = new Map<string, string>();
  for (const s of ed.stations) {
    const desc = resolveQuote(docs, s.description, `station ${s.slug}`);
    const data = {
      name: s.name,
      region: s.region,
      kind: s.kind,
      lat: s.lat,
      lng: s.lng,
      established: s.established ?? null,
      elevation: s.elevation ?? null,
      location: s.location,
      description: desc.text,
      sourceUrl: s.sourceUrl,
      liveKey: s.liveKey ?? null,
    };
    const row = await db.station.upsert({ where: { slug: s.slug }, update: data, create: { slug: s.slug, ...data } });
    stationIds.set(s.slug, row.id);
    counts.stations++;
  }

  // Timeline entries (expeditions, programmes, milestones)
  const entryIds = new Map<string, string>();
  for (const e of ed.entries) {
    if (e.station && !stationIds.has(e.station)) throw new Error(`entry ${e.slug}: unknown station ${e.station}`);
    const summary = resolveQuote(docs, e.summary, `entry ${e.slug}`);
    const data = {
      kind: e.kind,
      name: e.name,
      shortName: e.shortName,
      number: e.number ?? null,
      year: e.year,
      season: e.season ?? null,
      region: e.region,
      stationId: e.station ? stationIds.get(e.station)! : null,
      summary: summary.text,
      sourceUrl: summary.doc.url,
      featured: !!e.featured,
      hasStory: !!ed.stories[e.slug]?.length,
    };
    const row = await db.expedition.upsert({ where: { slug: e.slug }, update: data, create: { slug: e.slug, ...data } });
    entryIds.set(e.slug, row.id);
    counts.entries++;
  }

  // Documents and their sections
  const reportIds = new Map<string, string>();
  for (const e of ed.entries) {
    for (const key of e.documents) {
      const doc = docs.get(key);
      if (!doc) throw new Error(`entry ${e.slug}: unknown document ${key}`);
      if (reportIds.has(key)) throw new Error(`document ${key} is attached to more than one entry`);
      const data = {
        slug: `${slugify(doc.title).slice(0, 70).replace(/-$/, "")}-${doc.sourceSystem}-${doc.sourceId.toLowerCase()}`,
        expeditionId: entryIds.get(e.slug)!,
        title: doc.title,
        type: ed.documentTypes[key] ?? (doc.sourceSystem === "pib" ? "press-release" : "station-profile"),
        publisher: doc.organisation && doc.organisation !== doc.publisher ? `${doc.organisation} · ${doc.publisher}` : doc.publisher,
        publishedOn: new Date(doc.publishedOn ?? doc.retrievedAt),
        abstract: doc.sections[0].body.split(/(?<=\.)\s/).slice(0, 2).join(" "),
        externalUrl: doc.url,
        contentStatus: "official",
        contentHash: doc.contentHash,
        retrievedAt: new Date(doc.retrievedAt),
      };
      const existing = await db.report.findUnique({
        where: { sourceSystem_sourceId: { sourceSystem: doc.sourceSystem, sourceId: doc.sourceId } },
      });
      const report = existing
        ? await db.report.update({ where: { id: existing.id }, data })
        : await db.report.create({ data: { ...data, sourceSystem: doc.sourceSystem, sourceId: doc.sourceId } });
      reportIds.set(key, report.id);
      counts.documents++;

      // Sections update in place (citation links stay stable); ones that disappeared are dropped.
      for (const [i, s] of doc.sections.entries()) {
        await db.reportSection.upsert({
          where: { reportId_number: { reportId: report.id, number: s.number } },
          update: { order: i, heading: s.heading, body: s.body },
          create: { reportId: report.id, order: i, number: s.number, heading: s.heading, body: s.body },
        });
        counts.sections++;
      }
      await db.reportSection.deleteMany({ where: { reportId: report.id, number: { notIn: doc.sections.map((s) => s.number) } } });
    }
  }

  // Media: licensed photos and official videos, deduplicated on their source page URL.
  const mediaIds = new Map<string, string>();
  for (const m of ed.media) {
    const data = {
      kind: m.kind,
      title: m.title,
      caption: m.caption,
      altText: m.altText,
      url: m.url,
      youtubeId: m.youtubeId ?? null,
      author: m.author,
      license: m.license,
      licenseUrl: m.licenseUrl ?? null,
      stationId: m.station ? stationIds.get(m.station) ?? null : null,
      expeditionId: m.entry ? entryIds.get(m.entry) ?? null : null,
    };
    const row = await db.media.upsert({ where: { sourceUrl: m.sourceUrl }, update: data, create: { sourceUrl: m.sourceUrl, ...data } });
    mediaIds.set(m.id, row.id);
    counts.media++;
  }

  // Official data resources, deduplicated on URL.
  for (const r of ed.resources) {
    const data = {
      title: r.title,
      kind: r.kind,
      description: r.description,
      publisher: r.publisher,
      stationId: r.station ? stationIds.get(r.station) ?? null : null,
      expeditionId: r.entry ? entryIds.get(r.entry) ?? null : null,
    };
    await db.resource.upsert({ where: { url: r.url }, update: data, create: { url: r.url, ...data } });
    counts.resources++;
  }

  // Stories are rebuilt on each sync; nothing else references chapters.
  for (const [slug, chapters] of Object.entries(ed.stories)) {
    const expeditionId = entryIds.get(slug);
    if (!expeditionId) throw new Error(`story for unknown entry ${slug}`);
    await db.storyChapter.deleteMany({ where: { expeditionId } });
    for (const [order, c] of chapters.entries()) {
      const src = c.doc ? resolveQuote(docs, { doc: c.doc, section: c.section!, quote: c.quote }, `story ${slug} #${order + 1}`) : null;
      if (c.doc && !reportIds.has(c.doc)) throw new Error(`story ${slug}: document ${c.doc} is not attached to any entry`);
      if (c.media && !mediaIds.has(c.media)) throw new Error(`story ${slug}: unknown media ${c.media}`);
      await db.storyChapter.create({
        data: {
          expeditionId,
          order,
          kind: c.kind,
          title: c.title,
          body: src?.text ?? c.body ?? "",
          sourceReportId: c.doc ? reportIds.get(c.doc)! : null,
          sourceSection: c.section ?? null,
          lat: c.focus?.lat ?? null,
          lng: c.focus?.lng ?? null,
          zoom: c.focus?.zoom ?? null,
          mediaId: c.media ? mediaIds.get(c.media)! : null,
        },
      });
      counts.chapters++;
    }
  }

  // Regions and site copy.
  for (const r of ed.regions) {
    await db.region.upsert({ where: { slug: r.slug }, update: { label: r.label, blurb: r.blurb, order: r.order }, create: r });
  }
  for (const [key, value] of Object.entries(ed.copy)) {
    await db.siteCopy.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
  await db.siteCopy.deleteMany({ where: { key: { notIn: Object.keys(ed.copy) } } });

  // Remove source-derived rows that are no longer in the editorial set.
  counts.removed += (await db.media.deleteMany({ where: { sourceUrl: { notIn: ed.media.map((m) => m.sourceUrl) } } })).count;
  counts.removed += (await db.resource.deleteMany({ where: { url: { notIn: ed.resources.map((r) => r.url) } } })).count;
  counts.removed += (await db.report.deleteMany({ where: { id: { notIn: [...reportIds.values()] } } })).count;
  counts.removed += (await db.expedition.deleteMany({ where: { slug: { notIn: [...entryIds.keys()] } } })).count;
  // Stations that have field entries are kept even if dropped from the editorial list.
  counts.removed += (await db.station.deleteMany({ where: { slug: { notIn: [...stationIds.keys()] }, fieldEntries: { none: {} } } })).count;

  console.log("Synced:", counts);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
