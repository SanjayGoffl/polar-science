import Image from "next/image";
import Link from "next/link";
import { StatusBadge } from "@/components/Provenance";
import { SearchBox } from "@/components/SearchBox";
import { db } from "@/lib/db";
import { REGIONS, regionColor, regionLabel, type Region } from "@/lib/regions";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [featured, stories, counts, latestNotes] = await Promise.all([
    db.expedition.findFirst({ where: { featured: true }, include: { station: true } }),
    db.expedition.findMany({ where: { hasStory: true }, include: { station: true }, orderBy: { year: "desc" } }),
    Promise.all([db.expedition.count(), db.station.count(), db.report.count()]),
    db.fieldEntry.findMany({
      where: { reviewStatus: "approved" },
      orderBy: { capturedAt: "desc" },
      take: 3,
      include: { station: true },
    }),
  ]);
  const regionCounts = await db.expedition.groupBy({ by: ["region"], _count: true });

  return (
    <>
      {/* Hero: featured expedition */}
      {featured && (
        <section className="relative isolate overflow-hidden text-white">
          <Image src={featured.heroImage} alt="" fill priority className="object-cover -z-10" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0b1822]/85 via-[#0b1822]/55 to-transparent" />
          <div className="mx-auto max-w-6xl px-5 py-24 md:py-32">
            <p className="eyebrow !text-white/75 flex flex-wrap items-center gap-2">
              Featured story · {featured.season}
              <StatusBadge status={featured.contentStatus} className="bg-white/90" />
            </p>
            <h1 className="font-serif text-5xl md:text-7xl leading-[1.02] tracking-tight max-w-3xl mt-3">
              The summer the sea ice came up short.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/85">
              Follow India&apos;s {featured.shortName} expedition to {featured.station.name} station: why they went, what they
              measured, and what they found.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={`/expeditions/${featured.slug}/story`} className="btn btn-accent text-base">
                Begin the story →
              </Link>
              <Link href="/explore" className="btn btn-light text-base">
                Explore the map
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Pitch + search */}
      <section className="mx-auto max-w-6xl px-5 -mt-8 relative z-10">
        <div className="card p-6 md:p-8 shadow-xl grid md:grid-cols-[1.1fr_1fr] gap-8 items-center">
          <div>
            <p className="font-serif text-2xl leading-snug">
              NCPOR already has the data. This is the layer that makes it{" "}
              <em className="text-accent not-italic">discoverable, understandable and shareable</em>.
            </p>
            <p className="text-sm text-muted mt-3">
              {counts[0]} expeditions · {counts[1]} stations & sites · {counts[2]} reports and publications. Scientific datasets stay
              at the{" "}
              <a href="https://npdc.ncaor.gov.in/" target="_blank" rel="noreferrer" className="underline">
                National Polar Data Center ↗
              </a>
            </p>
          </div>
          <SearchBox />
        </div>
      </section>

      {/* Regions */}
      <section className="mx-auto max-w-6xl px-5 mt-20" aria-labelledby="regions-h">
        <p className="eyebrow">Three frontiers</p>
        <h2 id="regions-h" className="font-serif text-4xl tracking-tight mb-8">
          Choose where to go
        </h2>
        <div className="grid md:grid-cols-3 gap-5">
          {(Object.keys(REGIONS) as Region[]).map((r) => {
            const n = regionCounts.find((c) => c.region === r)?._count ?? 0;
            return (
              <Link
                key={r}
                href={`/explore?region=${r}`}
                className="group relative isolate overflow-hidden rounded-2xl aspect-[4/5] flex flex-col justify-end p-6 text-white"
              >
                <Image src={REGIONS[r].image} alt="" fill className="object-cover -z-10 transition duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                <span className="eyebrow !text-white/80">
                  {n} expedition{n === 1 ? "" : "s"}
                </span>
                <h3 className="font-serif text-4xl mt-1">{REGIONS[r].label}</h3>
                <p className="text-sm text-white/85 mt-2">{REGIONS[r].blurb}</p>
                <span className="mt-4 text-sm font-semibold">Open on the map →</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Stories */}
      <section className="mx-auto max-w-6xl px-5 mt-24" aria-labelledby="stories-h">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="eyebrow">Expedition stories</p>
            <h2 id="stories-h" className="font-serif text-4xl tracking-tight">
              Science told chapter by chapter
            </h2>
          </div>
          <Link href="/explore" className="text-sm font-semibold underline underline-offset-4 hidden sm:block">
            All expeditions →
          </Link>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {stories.map((s) => (
            <Link key={s.id} href={`/expeditions/${s.slug}/story`} className="group card overflow-hidden flex flex-col">
              <div className="relative aspect-[16/9]">
                <Image src={s.heroImage} alt="" fill className="object-cover transition duration-700 group-hover:scale-105" />
              </div>
              <div className="p-6">
                <p className="eyebrow flex flex-wrap items-center gap-2" style={{ color: regionColor(s.region) }}>
                  {regionLabel(s.region)} · {s.station.name} · {s.year}
                  <StatusBadge status={s.contentStatus} />
                </p>
                <h3 className="font-serif text-2xl mt-1 leading-snug">{s.name}</h3>
                <p className="text-sm text-ink-2 mt-2">{s.summary}</p>
                <p className="mt-4 text-sm font-semibold text-accent">8 chapters · Read the story →</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* From the field */}
      {latestNotes.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 mt-24" aria-labelledby="field-h">
          <p className="eyebrow">Live from the field</p>
          <h2 id="field-h" className="font-serif text-4xl tracking-tight mb-2">
            Field notes
          </h2>
          <p className="text-ink-2 mb-8 max-w-2xl">
            Logged by scientists at the stations, even without a connection, and published after review.
          </p>
          <div className="grid md:grid-cols-3 gap-5">
            {latestNotes.map((n) => (
              <Link key={n.id} href={`/stations/${n.station.slug}`} className="card p-5 hover:border-ink transition">
                <p className="eyebrow" style={{ color: regionColor(n.station.region) }}>
                  {n.station.name} · {n.activity}
                </p>
                <p className="mt-2 text-sm text-ink-2 line-clamp-4">“{n.notes}”</p>
                <p className="text-xs text-muted mt-3">
                  {n.submittedBy} · {n.capturedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
