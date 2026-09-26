import type { Metadata } from "next";
import Link from "next/link";
import { SearchBox } from "@/components/SearchBox";
import { db } from "@/lib/db";
import { REPORT_TYPE_LABEL, regionColor, regionLabel } from "@/lib/regions";

export const metadata: Metadata = { title: "Search" };
export const dynamic = "force-dynamic";

/** Search the portal's own stories, stations and reports. Dataset search stays with NPDC. */
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim().slice(0, 100);
  const has = q.length >= 2;
  const like = { contains: q };

  const [expeditions, stations, reports, notes, media, resources] = has
    ? await Promise.all([
        db.expedition.findMany({ where: { OR: [{ name: like }, { shortName: like }, { summary: like }] }, include: { station: true }, take: 10 }),
        db.station.findMany({ where: { OR: [{ name: like }, { location: like }, { description: like }] }, take: 10 }),
        db.report.findMany({
          where: { OR: [{ title: like }, { abstract: like }, { sections: { some: { OR: [{ heading: like }, { body: like }] } } }] },
          include: { expedition: true, sections: { where: { OR: [{ heading: like }, { body: like }] }, take: 1 } },
          take: 20,
        }),
        db.fieldEntry.findMany({
          where: { reviewStatus: "approved", OR: [{ notes: like }, { activity: like }] },
          include: { station: true },
          orderBy: { capturedAt: "desc" },
          take: 10,
        }),
        db.media.findMany({ where: { OR: [{ title: like }, { caption: like }, { author: like }] }, take: 12 }),
        db.resource.findMany({ where: { OR: [{ title: like }, { description: like }, { publisher: like }] }, take: 12 }),
      ])
    : [[], [], [], [], [], []];

  const total = expeditions.length + stations.length + reports.length + notes.length + media.length + resources.length;

  const snippet = (text: string) => {
    const i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return text.slice(0, 180) + "…";
    const start = Math.max(0, i - 70);
    return (start > 0 ? "…" : "") + text.slice(start, i + q.length + 110) + "…";
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
        <p className="mt-10 text-sm text-muted">
          {total} result{total === 1 ? "" : "s"} for “{q}”
        </p>
      )}

      {stations.length > 0 && (
        <section className="mt-6">
          <h2 className="eyebrow mb-3">Stations & sites</h2>
          <ul className="grid sm:grid-cols-2 gap-3">
            {stations.map((s) => (
              <li key={s.id}>
                <Link href={`/stations/${s.slug}`} className="card p-4 block hover:border-ink">
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: regionColor(s.region) }}>{regionLabel(s.region)}</span>
                  <span className="block font-serif text-xl">{s.name}</span>
                  <span className="block text-xs text-muted">{s.location}</span>
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
              <li key={e.id}>
                <Link href={e.hasStory ? `/expeditions/${e.slug}/story` : `/expeditions/${e.slug}`} className="card p-4 block hover:border-ink">
                  <span className="text-xs text-muted">{e.year}{e.station ? ` · ${e.station.name}` : ""}</span>
                  <span className="block font-serif text-xl">{e.name}</span>
                  <span className="block text-sm text-ink-2">{e.summary}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {reports.length > 0 && (
        <section className="mt-10">
          <h2 className="eyebrow mb-3">Reports & publications</h2>
          <ul className="divide-y divide-line border-y border-line">
            {reports.map((r) => {
              const sec = r.sections[0];
              return (
                <li key={r.id} className="py-4">
                  <p className="text-xs text-muted">{REPORT_TYPE_LABEL[r.type] ?? r.type} · {r.expedition.shortName}</p>
                  <Link href={`/reports/${r.slug}${sec ? `#section-${sec.number}` : ""}`} className="font-serif text-lg hover:underline">{r.title}</Link>
                  <p className="text-sm text-ink-2 mt-1">{sec ? <><strong>§{sec.number} {sec.heading}:</strong> {snippet(sec.body)}</> : snippet(r.abstract)}</p>
                </li>
              );
            })}
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
