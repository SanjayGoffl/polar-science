import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SourceNotice } from "@/components/Provenance";
import { db } from "@/lib/db";
import { REPORT_TYPE_LABEL, regionColor, regionLabel } from "@/lib/regions";

export const dynamic = "force-dynamic";

async function load(slug: string) {
  return db.expedition.findUnique({
    where: { slug },
    include: {
      station: true,
      projects: true,
      reports: { orderBy: { publishedOn: "asc" } },
      media: true,
      dataProducts: true,
      members: { include: { person: true } },
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const e = await load((await params).slug);
  return { title: e?.shortName ?? "Expedition" };
}

export default async function ExpeditionPage({ params }: { params: Promise<{ slug: string }> }) {
  const e = await load((await params).slug);
  if (!e) notFound();
  const color = regionColor(e.region);

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <nav className="text-xs text-muted mb-6" aria-label="Breadcrumb">
        <Link href="/explore" className="hover:text-ink">Explore</Link> / <Link href={`/explore?region=${e.region}`} className="hover:text-ink">{regionLabel(e.region)}</Link> / {e.shortName}
      </nav>
      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-10 items-start">
        <div>
          <p className="eyebrow" style={{ color }}>
            {regionLabel(e.region)} · <Link href={`/stations/${e.station.slug}`} className="hover:underline">{e.station.name}</Link> · {e.season}
          </p>
          <h1 className="font-serif text-4xl md:text-5xl tracking-tight leading-tight mt-2">{e.name}</h1>
          <p className="text-lg text-ink-2 mt-4 leading-relaxed">{e.summary}</p>
          <div className="mt-4">
            <SourceNotice status={e.contentStatus} sourceUrl={e.sourceUrl} what="expedition record" />
          </div>
          {e.hasStory && (
            <Link href={`/expeditions/${e.slug}/story`} className="btn btn-accent mt-6">
              Read the full story →
            </Link>
          )}
        </div>
        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden">
          <Image src={e.heroImage} alt="" fill className="object-cover" />
        </div>
      </div>

      {e.projects.length > 0 && (
        <section className="mt-16">
          <h2 className="font-serif text-3xl mb-5">Research projects</h2>
          <ul className="grid md:grid-cols-2 gap-4">
            {e.projects.map((p) => (
              <li key={p.id} className="card p-5">
                <p className="eyebrow" style={{ color }}>{p.topic}</p>
                <p className="font-semibold mt-1">{p.title}</p>
                <p className="text-sm text-ink-2 mt-1">{p.summary}</p>
                <p className="text-xs text-muted mt-2">Led by {p.lead}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-16">
        <h2 className="font-serif text-3xl mb-5">Reports & publications</h2>
        <ul className="divide-y divide-line border-y border-line">
          {e.reports.map((r) => (
            <li key={r.id} className="py-5 grid md:grid-cols-[1fr_auto] gap-4 items-center">
              <div>
                <p className="text-xs text-muted">
                  {REPORT_TYPE_LABEL[r.type] ?? r.type} · {r.publishedOn.getFullYear()} · {r.authors}
                </p>
                <Link href={`/reports/${r.slug}`} className="font-serif text-xl hover:underline">{r.title}</Link>
              </div>
              <Link href={`/reports/${r.slug}?explain=student`} className="btn btn-ghost !text-sm !py-2 justify-self-start">
                ✦ Explain simply
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {e.dataProducts.length > 0 && (
        <section className="mt-16">
          <h2 className="font-serif text-3xl mb-2">Data generated</h2>
          <p className="text-sm text-muted mb-5">Datasets are held by the National Polar Data Center. Names here are illustrative.</p>
          <ul className="grid md:grid-cols-2 gap-4">
            {e.dataProducts.map((d) => (
              <li key={d.id} className="card p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted">{d.format} · {d.volume}</p>
                <p className="font-semibold mt-1">{d.title}</p>
                <p className="text-sm text-ink-2">{d.parameter}</p>
                <a href={d.npdcUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold underline mt-2 inline-block">Find on NPDC ↗</a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {e.media.length > 0 && (
        <section className="mt-16">
          <h2 className="font-serif text-3xl mb-5">Photos</h2>
          <ul className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {e.media.map((m) => (
              <li key={m.id}>
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
                  <Image src={m.url} alt={m.altText} fill className="object-cover" />
                </div>
                <p className="text-xs text-ink-2 mt-2">{m.caption}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
