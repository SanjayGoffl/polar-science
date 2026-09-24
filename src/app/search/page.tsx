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

  const [expeditions, stations, reports] = has
    ? await Promise.all([
        db.expedition.findMany({ where: { OR: [{ name: like }, { shortName: like }, { summary: like }] }, include: { station: true }, take: 10 }),
        db.station.findMany({ where: { OR: [{ name: like }, { location: like }, { description: like }] }, take: 10 }),
        db.report.findMany({
          where: { OR: [{ title: like }, { abstract: like }, { sections: { some: { OR: [{ heading: like }, { body: like }] } } }] },
          include: { expedition: true, sections: { where: { OR: [{ heading: like }, { body: like }] }, take: 1 } },
          take: 20,
        }),
      ])
    : [[], [], []];

  const total = expeditions.length + stations.length + reports.length;

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
        Searches stories, stations and reports in this portal. For scientific datasets, use the{" "}
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
                  <span className="text-xs text-muted">{e.year} · {e.station.name}</span>
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

      {has && total === 0 && <p className="mt-8 card p-8 text-center text-muted">Nothing matched. Try “ice”, “glacier” or “Maitri”.</p>}
    </div>
  );
}
