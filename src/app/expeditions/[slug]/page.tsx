import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Gallery } from "@/components/story/Gallery";
import { db } from "@/lib/db";
import { toGalleryItem } from "@/lib/queries";
import { ENTRY_KIND_LABEL, REPORT_TYPE_LABEL, regionColor, regionLabel } from "@/lib/regions";

export const dynamic = "force-dynamic";

async function load(slug: string) {
  return db.expedition.findUnique({
    where: { slug },
    include: { station: true, reports: { orderBy: { publishedOn: "asc" } }, media: true, resources: true },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const e = await load((await params).slug);
  return e ? { title: e.shortName, description: e.summary } : { title: "Expedition" };
}

export default async function ExpeditionPage({ params }: { params: Promise<{ slug: string }> }) {
  const e = await load((await params).slug);
  if (!e) notFound();
  const color = regionColor(e.region);
  const fmt = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <nav className="text-xs text-muted mb-6" aria-label="Breadcrumb">
        <Link href="/explore" className="hover:text-ink">Explore</Link> /{" "}
        <Link href={`/explore?region=${e.region}`} className="hover:text-ink">{regionLabel(e.region)}</Link> / {e.shortName}
      </nav>
      <p className="eyebrow" style={{ color }}>
        {ENTRY_KIND_LABEL[e.kind] ?? e.kind} · {regionLabel(e.region)}
        {e.station && (
          <>
            {" · "}
            <Link href={`/stations/${e.station.slug}`} className="hover:underline">{e.station.name}</Link>
          </>
        )}
        {e.season ? ` · ${e.season}` : ` · ${e.year}`}
      </p>
      <h1 className="font-serif text-4xl md:text-5xl tracking-tight leading-tight mt-2">{e.name}</h1>
      <blockquote className="mt-5 border-l-2 pl-5 text-lg text-ink-2 leading-relaxed" style={{ borderColor: color }}>
        {e.summary}
      </blockquote>
      <p className="mt-3 text-xs text-muted">
        Quoted from the official source.{" "}
        <a href={e.sourceUrl} target="_blank" rel="noreferrer" className="underline">View the original ↗</a>
      </p>
      {e.hasStory && (
        <Link href={`/expeditions/${e.slug}/story`} className="btn btn-accent mt-6">
          Read the full story →
        </Link>
      )}

      <section className="mt-14" aria-labelledby="docs-h">
        <h2 id="docs-h" className="font-serif text-3xl mb-5">Source documents</h2>
        <ul className="divide-y divide-line border-y border-line">
          {e.reports.map((r) => (
            <li key={r.id} className="py-5 grid md:grid-cols-[1fr_auto] gap-4 items-center">
              <div>
                <p className="text-xs text-muted">
                  {REPORT_TYPE_LABEL[r.type] ?? r.type} · {fmt(r.publishedOn)} · {r.publisher.split(" · ").pop()}
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

      {e.resources.length > 0 && (
        <section className="mt-14" aria-labelledby="res-h">
          <h2 id="res-h" className="font-serif text-3xl mb-5">Data and official resources</h2>
          <ul className="grid md:grid-cols-2 gap-4">
            {e.resources.map((r) => (
              <li key={r.id} className="card p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted">{r.kind.replaceAll("-", " ")} · {r.publisher}</p>
                <p className="font-semibold mt-1">{r.title}</p>
                <p className="text-sm text-ink-2">{r.description}</p>
                <a href={r.url} target="_blank" rel="noreferrer" className="text-sm font-semibold underline mt-2 inline-block">Open ↗</a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {e.media.length > 0 && (
        <section className="mt-14" aria-labelledby="media-h">
          <h2 id="media-h" className="font-serif text-3xl">Photos and videos</h2>
          <Gallery items={e.media.map(toGalleryItem)} />
        </section>
      )}
    </div>
  );
}
