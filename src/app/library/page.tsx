import type { Metadata } from "next";
import Link from "next/link";
import { Gallery } from "@/components/story/Gallery";
import { getSiteContent } from "@/lib/copy";
import { db } from "@/lib/db";
import { toGalleryItem } from "@/lib/queries";
import { REPORT_TYPE_LABEL, regionColor, regionLabel } from "@/lib/regions";

export const metadata: Metadata = { title: "Library", description: "Every official document, photograph and data resource on Polar Stories." };
export const dynamic = "force-dynamic";

const TABS = [
  { key: "documents", label: "Documents" },
  { key: "media", label: "Photos and videos" },
  { key: "data", label: "Data resources" },
] as const;

export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ tab?: string; type?: string; region?: string }> }) {
  const sp = await searchParams;
  const tab = TABS.some((t) => t.key === sp.tab) ? sp.tab! : "documents";
  const { t } = await getSiteContent();
  const [docs, media, resources, counts] = await Promise.all([
    tab === "documents"
      ? db.report.findMany({
          where: { ...(sp.type ? { type: sp.type } : {}), ...(sp.region ? { expedition: { region: sp.region } } : {}) },
          include: { expedition: { select: { shortName: true, region: true, slug: true } }, _count: { select: { sections: true } } },
          orderBy: { publishedOn: "desc" },
        })
      : [],
    tab === "media" ? db.media.findMany({ orderBy: { title: "asc" } }) : [],
    tab === "data" ? db.resource.findMany({ include: { station: true }, orderBy: [{ kind: "asc" }, { title: "asc" }] }) : [],
    Promise.all([db.report.count(), db.media.count(), db.resource.count()]),
  ]);
  const types = tab === "documents" ? await db.report.groupBy({ by: ["type"], _count: true }) : [];
  const fmt = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const qs = (p: Record<string, string | undefined>) => {
    const u = new URLSearchParams(Object.entries({ tab, type: sp.type, region: sp.region, ...p }).filter(([, v]) => v) as [string, string][]);
    return `/library?${u}`;
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="font-serif text-4xl md:text-5xl tracking-tight">{t("library.title")}</h1>
      <p className="text-ink-2 mt-3 max-w-2xl">{t("library.lede")}</p>

      <nav aria-label="Library sections" className="mt-8 flex flex-wrap gap-1 rounded-full bg-paper-2 p-1 w-fit">
        {TABS.map((x, i) => (
          <Link
            key={x.key}
            href={`/library?tab=${x.key}`}
            aria-current={tab === x.key ? "page" : undefined}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold ${tab === x.key ? "bg-white shadow" : "text-ink-2 hover:text-ink"}`}
          >
            {x.label} <span className="text-muted font-normal">{counts[i]}</span>
          </Link>
        ))}
      </nav>

      {tab === "documents" && (
        <>
          <div className="mt-6 flex flex-wrap gap-2 text-sm" aria-label="Filter documents">
            <Link href={qs({ type: undefined })} className={`rounded-full border px-3 py-1 ${!sp.type ? "border-ink bg-ink text-paper" : "border-line"}`}>
              All types
            </Link>
            {types.map((ty) => (
              <Link key={ty.type} href={qs({ type: ty.type })} className={`rounded-full border px-3 py-1 ${sp.type === ty.type ? "border-ink bg-ink text-paper" : "border-line"}`}>
                {REPORT_TYPE_LABEL[ty.type] ?? ty.type} ({ty._count})
              </Link>
            ))}
            <span className="mx-2 text-line" aria-hidden>|</span>
            {["antarctica", "arctic", "himalaya"].map((r) => (
              <Link key={r} href={qs({ region: sp.region === r ? undefined : r })} className={`rounded-full border px-3 py-1 ${sp.region === r ? "border-ink bg-ink text-paper" : "border-line"}`}>
                {regionLabel(r)}
              </Link>
            ))}
          </div>
          <ul className="mt-6 divide-y divide-line border-y border-line" data-testid="library-documents">
            {docs.map((r) => (
              <li key={r.id} className="py-5 grid md:grid-cols-[1fr_auto] gap-3 items-center">
                <div>
                  <p className="text-xs text-muted">
                    <span style={{ color: regionColor(r.expedition.region) }} className="font-semibold">{regionLabel(r.expedition.region)}</span> ·{" "}
                    {REPORT_TYPE_LABEL[r.type] ?? r.type} · {fmt(r.publishedOn)} · {r.publisher.split(" · ").pop()} · {r._count.sections} sections
                  </p>
                  <Link href={`/reports/${r.slug}`} className="font-serif text-xl hover:underline">{r.title}</Link>
                  <p className="text-xs text-muted mt-1">
                    Part of <Link href={`/expeditions/${r.expedition.slug}`} className="underline">{r.expedition.shortName}</Link> ·{" "}
                    <a href={r.externalUrl} target="_blank" rel="noreferrer" className="underline">original ↗</a>
                  </p>
                </div>
                <Link href={`/reports/${r.slug}`} className="btn btn-ghost !text-sm !py-2 justify-self-start">Read</Link>
              </li>
            ))}
            {docs.length === 0 && <li className="py-10 text-center text-muted">No documents match these filters.</li>}
          </ul>
        </>
      )}

      {tab === "media" && <Gallery items={media.map(toGalleryItem)} />}

      {tab === "data" && (
        <ul className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map((r) => (
            <li key={r.id}>
              <a href={r.url} target="_blank" rel="noreferrer" className="card p-5 block h-full hover:border-ink">
                <span className="block text-[10px] font-bold uppercase tracking-widest text-muted">
                  {r.kind.replaceAll("-", " ")} · {r.publisher}
                  {r.station ? ` · ${r.station.name}` : ""}
                </span>
                <span className="block font-semibold mt-1">{r.title} ↗</span>
                <span className="block text-sm text-ink-2 mt-1">{r.description}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
