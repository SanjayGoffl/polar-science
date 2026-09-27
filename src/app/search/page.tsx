import type { Metadata } from "next";
import Link from "next/link";
import { SearchBox } from "@/components/SearchBox";
import { db } from "@/lib/db";
import { REGIONS } from "@/lib/regions";
import { regionColor, regionLabel } from "@/lib/regions";
import { searchIndex } from "@/lib/search";

export const metadata: Metadata = { title: "Search" };
export const dynamic = "force-dynamic";

/** `snippet()` wraps matches in \u0001…\u0002 (see src/lib/search.ts); render them as <mark> without dangerouslySetInnerHTML. */
function Snippet({ text }: { text: string }) {
  const parts = text.split(/\u0001(.*?)\u0002/);
  return (
    <>
      {parts.map((part, i) => (i % 2 === 1 ? <mark key={i}>{part}</mark> : part))}
    </>
  );
}

/** Search the portal's own stories, stations and reports (FTS5). Dataset search stays with NPDC. */
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; region?: string; year?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const region = sp.region && sp.region in REGIONS ? sp.region : undefined;
  const year = sp.year ? Number(sp.year) : undefined;
  const has = q.length >= 2;
  const like = { contains: q };

  const [hits, notes, media, resources, years] = has
    ? await Promise.all([
        searchIndex({ q, region, year }),
        db.fieldEntry.findMany({
          where: { reviewStatus: "approved", OR: [{ notes: like }, { activity: like }] },
          include: { station: true },
          orderBy: { capturedAt: "desc" },
          take: 10,
        }),
        db.media.findMany({ where: { OR: [{ title: like }, { caption: like }, { author: like }] }, take: 12 }),
        db.resource.findMany({ where: { OR: [{ title: like }, { description: like }, { publisher: like }] }, take: 12 }),
        db.$queryRawUnsafe<{ year: number }[]>(`SELECT DISTINCT year FROM "SearchIndex" WHERE year IS NOT NULL ORDER BY year DESC`),
      ])
    : [[], [], [], [], []];

  const stations = hits.filter((h) => h.entityType === "station");
  const expeditions = hits.filter((h) => h.entityType === "expedition");
  const sections = hits.filter((h) => h.entityType === "section");
  const total = hits.length + notes.length + media.length + resources.length;

  const snippet = (text: string) => {
    const i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return text.slice(0, 180) + "…";
    const start = Math.max(0, i - 70);
    return (start > 0 ? "…" : "") + text.slice(start, i + q.length + 110) + "…";
  };

  const filterHref = (next: { region?: string; year?: string }) => {
    const p = new URLSearchParams({ q });
    const r = "region" in next ? next.region : region;
    const y = "year" in next ? next.year : year?.toString();
    if (r) p.set("region", r);
    if (y) p.set("year", y);
    return `/search?${p.toString()}`;
  };

  return (
    <div className="mx-auto max-w-4xl px-5 py-12">
      <h1 className="font-serif text-4xl tracking-tight mb-6">Search</h1>
      <SearchBox defaultValue={q} />
      <p className="text-xs text-muted mt-3">
        Searches stations, expeditions, official documents, photos, data resources and published field notes. For scientific datasets, use the{" "}
        <a href="https://npdc.ncaor.gov.in/" className="underline" target="_blank" rel="noreferrer">National Polar Data Center ↗</a>.
      </p>

      {has && (
        <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted mr-1">Region:</span>
          <Link href={filterHref({ region: "" })} className={`rounded-full px-2.5 py-1 border ${!region ? "bg-ink text-paper border-ink" : "border-line"}`}>All</Link>
          {Object.entries(REGIONS).map(([slug, r]) => (
            <Link key={slug} href={filterHref({ region: slug })} className={`rounded-full px-2.5 py-1 border ${region === slug ? "bg-ink text-paper border-ink" : "border-line"}`}>
              {r.label}
            </Link>
          ))}
          {years.length > 0 && (
            <>
              <span className="text-muted ml-3 mr-1">Year:</span>
              <Link href={filterHref({ year: "" })} className={`rounded-full px-2.5 py-1 border ${!year ? "bg-ink text-paper border-ink" : "border-line"}`}>All</Link>
              {years.map((y) => (
                <Link key={y.year} href={filterHref({ year: String(y.year) })} className={`rounded-full px-2.5 py-1 border ${year === y.year ? "bg-ink text-paper border-ink" : "border-line"}`}>
                  {y.year}
                </Link>
              ))}
            </>
          )}
        </div>
      )}

      {has && (
        <p className="mt-6 text-sm text-muted">
          {total} result{total === 1 ? "" : "s"} for “{q}”
        </p>
      )}

      {stations.length > 0 && (
        <section className="mt-6">
          <h2 className="eyebrow mb-3">Stations & sites</h2>
          <ul className="grid sm:grid-cols-2 gap-3">
            {stations.map((s) => (
              <li key={s.entityId}>
                <Link href={s.url} className="card p-4 block hover:border-ink">
                  {s.region && <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: regionColor(s.region) }}>{regionLabel(s.region)}</span>}
                  <span className="block font-serif text-xl">{s.title}</span>
                  <span className="block text-xs text-muted">
                    <Snippet text={s.snippet} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {expeditions.length > 0 && (
        <section className="mt-10">
          <h2 className="eyebrow mb-3">Expeditions</h2>
          <ul className="space-y-3">
            {expeditions.map((e) => (
              <li key={e.entityId}>
                <Link href={e.url} className="card p-4 block hover:border-ink">
                  <span className="text-xs text-muted">{e.subtitle}</span>
                  <span className="block font-serif text-xl">{e.title}</span>
                  <span className="block text-sm text-ink-2">
                    <Snippet text={e.snippet} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {sections.length > 0 && (
        <section className="mt-10">
          <h2 className="eyebrow mb-3">Reports & publications</h2>
          <ul className="divide-y divide-line border-y border-line">
            {sections.map((s) => (
              <li key={s.entityId} className="py-4">
                <p className="text-xs text-muted">{s.subtitle}{s.year ? ` · ${s.year}` : ""}</p>
                <Link href={s.url} className="font-serif text-lg hover:underline">{s.title}</Link>
                <p className="text-sm text-ink-2 mt-1">
                  <Snippet text={s.snippet} />
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {notes.length > 0 && (
        <section className="mt-10">
          <h2 className="eyebrow mb-3">Field notes</h2>
          <ul className="space-y-3">
            {notes.map((n) => (
              <li key={n.id}>
                <Link href={`/stations/${n.station.slug}`} className="card p-4 block hover:border-ink">
                  <span className="text-xs text-muted">
                    {n.station.name} · {n.activity} · {n.submittedBy}
                  </span>
                  <span className="block text-sm text-ink-2 mt-1">“{snippet(n.notes)}”</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {resources.length > 0 && (
        <section className="mt-10">
          <h2 className="eyebrow mb-3">Data resources</h2>
          <ul className="grid sm:grid-cols-2 gap-3">
            {resources.map((r) => (
              <li key={r.id}>
                <a href={r.url} target="_blank" rel="noreferrer" className="card p-4 block hover:border-ink">
                  <span className="block text-xs text-muted">{r.kind.replaceAll("-", " ")} · {r.publisher}</span>
                  <span className="block font-semibold">{r.title} ↗</span>
                  <span className="block text-sm text-ink-2">{r.description}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {media.length > 0 && (
        <section className="mt-10">
          <h2 className="eyebrow mb-3">Photos and videos</h2>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {media.map((m) => (
              <li key={m.id}>
                <a href={m.sourceUrl} target="_blank" rel="noreferrer" className="block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.url} alt={m.altText} loading="lazy" className="aspect-[4/3] w-full rounded-lg object-cover" />
                  <span className="block text-xs mt-1 font-semibold">{m.title}</span>
                  <span className="block text-[11px] text-muted">{m.author} · {m.license}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {has && total === 0 && <p className="mt-8 card p-8 text-center text-muted">Nothing matched. Try “ice”, “glacier” or “Maitri”.</p>}
    </div>
  );
}
