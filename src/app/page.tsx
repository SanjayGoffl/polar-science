import Image from "next/image";
import Link from "next/link";
import { SearchBox } from "@/components/SearchBox";
import { db } from "@/lib/db";
import { getLiveReadings, LIVE_SOURCE_URL } from "@/lib/liveWeather";
import { stationPhotos } from "@/lib/queries";
import { REGIONS, regionColor, regionLabel, type Region } from "@/lib/regions";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [featured, stories, stations, counts, notes, portals, photos, live] = await Promise.all([
    db.expedition.findFirst({ where: { featured: true }, include: { station: true } }),
    db.expedition.findMany({ where: { hasStory: true }, include: { station: true, _count: { select: { chapters: true } } }, orderBy: { year: "desc" } }),
    db.station.findMany({ orderBy: { name: "asc" } }),
    Promise.all([db.expedition.count(), db.report.count(), db.media.count()]),
    db.fieldEntry.findMany({ where: { reviewStatus: "approved" }, orderBy: { capturedAt: "desc" }, take: 3, include: { station: true } }),
    db.resource.findMany({ where: { stationId: null, expeditionId: null }, orderBy: { title: "asc" } }),
    stationPhotos(),
    getLiveReadings(),
  ]);
  const heroPhoto = featured?.stationId ? photos.get(featured.stationId) : undefined;
  const regionPhoto = (r: Region) => {
    const s = stations.find((x) => x.region === r && photos.has(x.id));
    return s ? photos.get(s.id) : undefined;
  };
  const stationByLive = new Map(stations.filter((s) => s.liveKey).map((s) => [s.liveKey!, s]));

  return (
    <>
      {featured && (
        <section className="relative isolate overflow-hidden text-white" aria-labelledby="hero-h">
          <div className="absolute inset-0 -z-10">
            {heroPhoto ? (
              <Image src={heroPhoto.url} alt={heroPhoto.altText} fill priority className="object-cover" sizes="100vw" />
            ) : (
              <div className="absolute inset-0 bg-antarctica" />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-[#0b1822]/90 via-[#0b1822]/60 to-[#0b1822]/10" />
          </div>
          <div className="mx-auto max-w-6xl px-5 py-24 md:py-32">
            <p className="eyebrow !text-white/75">Featured story · {featured.season}</p>
            <h1 id="hero-h" className="font-serif text-5xl md:text-7xl leading-[1.02] tracking-tight max-w-3xl mt-3">
              Four decades on the ice.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/85">
              Follow the {featured.name}, told through the Government of India&apos;s own record of the voyage.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={`/expeditions/${featured.slug}/story`} className="btn btn-accent text-base">
                Begin the story →
              </Link>
              <Link href="/explore" className="btn btn-light text-base">
                Explore the map
              </Link>
            </div>
            {heroPhoto && (
              <p className="mt-10 text-[11px] text-white/60">
                Photo: {heroPhoto.title} · {heroPhoto.author} · {heroPhoto.license}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Pitch + search */}
      <section className="mx-auto max-w-6xl px-5 -mt-8 relative z-10">
        <div className="card p-6 md:p-8 shadow-xl grid md:grid-cols-[1.1fr_1fr] gap-8 items-center">
          <div>
            <p className="font-serif text-2xl leading-snug">
              India&apos;s polar and Himalayan research,{" "}
              <em className="text-accent not-italic">explained simply and linked to the source</em>.
            </p>
            <p className="text-sm text-muted mt-3">
              {counts[0]} expeditions and milestones · {counts[1]} official documents · {counts[2]} licensed photos. Scientific datasets stay at the{" "}
              <a href="https://npdc.ncpor.res.in/npdc/homepage.action" target="_blank" rel="noreferrer" className="underline">
                National Polar Data Center ↗
              </a>
            </p>
          </div>
          <SearchBox />
        </div>
      </section>

      {/* Live conditions */}
      {live.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 mt-14" aria-labelledby="live-h">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
            <h2 id="live-h" className="eyebrow">Right now at the stations</h2>
            <a href={LIVE_SOURCE_URL} target="_blank" rel="noreferrer" className="text-xs text-muted underline">
              Live data from NCPOR ↗
            </a>
          </div>
          <ul className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="live-strip">
            {live.map((r) => {
              const s = stationByLive.get(r.key);
              return (
                <li key={r.key} className="card p-4">
                  <p className="text-xs text-muted">{r.label}</p>
                  <p className="font-serif text-3xl mt-1">{r.tempC.toFixed(1)}°C</p>
                  <p className="text-[11px] text-muted mt-1">{r.observed}</p>
                  {s && (
                    <Link href={`/stations/${s.slug}`} className="text-xs font-semibold underline underline-offset-2 mt-2 inline-block">
                      About {s.name} →
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Regions */}
      <section className="mx-auto max-w-6xl px-5 mt-20" aria-labelledby="regions-h">
        <p className="eyebrow">Three frontiers</p>
        <h2 id="regions-h" className="font-serif text-4xl tracking-tight mb-8">
          Choose where to go
        </h2>
        <div className="grid md:grid-cols-3 gap-5">
          {(Object.keys(REGIONS) as Region[]).map((r) => {
            const p = regionPhoto(r);
            return (
              <Link key={r} href={`/explore?region=${r}`} className="group relative isolate overflow-hidden rounded-2xl aspect-[4/5] flex flex-col justify-end p-6 text-white">
                <div className="absolute inset-0 -z-10">
                  {p ? (
                    <Image src={p.url} alt={p.altText} fill className="object-cover transition duration-700 group-hover:scale-105" sizes="(min-width:768px) 33vw, 100vw" />
                  ) : (
                    <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${REGIONS[r].color}, #07121a)` }} />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                </div>
                <h3 className="font-serif text-4xl">{REGIONS[r].label}</h3>
                <p className="text-sm text-white/85 mt-2">{REGIONS[r].blurb}</p>
                <span className="mt-4 text-sm font-semibold">Open on the map →</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Stories */}
      <section className="mx-auto max-w-6xl px-5 mt-24" aria-labelledby="stories-h">
        <div className="flex items-end justify-between mb-8 gap-4">
          <div>
            <p className="eyebrow">Stories</p>
            <h2 id="stories-h" className="font-serif text-4xl tracking-tight">
              Science told chapter by chapter
            </h2>
          </div>
          <Link href="/stories" className="text-sm font-semibold underline underline-offset-4 shrink-0">
            All stories →
          </Link>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {stories.map((s) => (
            <Link key={s.id} href={`/expeditions/${s.slug}/story`} className="group card p-6 flex flex-col hover:border-ink">
              <p className="eyebrow" style={{ color: regionColor(s.region) }}>
                {regionLabel(s.region)}
                {s.station ? ` · ${s.station.name}` : ""}
              </p>
              <h3 className="font-serif text-2xl mt-2 leading-snug">{s.name}</h3>
              <p className="text-sm text-ink-2 mt-2 line-clamp-3">{s.summary}</p>
              <p className="mt-auto pt-4 text-sm font-semibold text-accent">{s._count.chapters} chapters · Read →</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Field notes */}
      {notes.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 mt-24" aria-labelledby="field-h">
          <p className="eyebrow">From the field</p>
          <h2 id="field-h" className="font-serif text-4xl tracking-tight mb-2">
            Field notes
          </h2>
          <p className="text-ink-2 mb-8 max-w-2xl">Logged by researchers at the stations, even without a connection, and published after review.</p>
          <div className="grid md:grid-cols-3 gap-5">
            {notes.map((n) => (
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

      {/* Official data */}
      {portals.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 mt-24" aria-labelledby="data-h">
          <p className="eyebrow">For researchers</p>
          <h2 id="data-h" className="font-serif text-4xl tracking-tight mb-2">
            Official data portals
          </h2>
          <p className="text-ink-2 mb-8 max-w-2xl">This site explains and links. The datasets themselves live with NCPOR and the National Polar Data Center.</p>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {portals.map((r) => (
              <li key={r.id}>
                <a href={r.url} target="_blank" rel="noreferrer" className="card p-5 block h-full hover:border-ink">
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-muted">
                    {r.kind.replaceAll("-", " ")} · {r.publisher}
                  </span>
                  <span className="block font-semibold mt-1">{r.title} ↗</span>
                  <span className="block text-sm text-ink-2 mt-1">{r.description}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
