import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Gallery } from "@/components/story/Gallery";
import { db } from "@/lib/db";
import { getLiveReadings, LIVE_SOURCE_URL } from "@/lib/liveWeather";
import { toGalleryItem } from "@/lib/queries";
import { ENTRY_KIND_LABEL, regionColor, regionLabel } from "@/lib/regions";

export const dynamic = "force-dynamic";

async function load(slug: string) {
  return db.station.findUnique({
    where: { slug },
    include: {
      expeditions: { orderBy: { year: "desc" } },
      media: true,
      resources: true,
      // Only reviewed field notes are public.
      fieldEntries: { where: { reviewStatus: "approved" }, orderBy: { capturedAt: "desc" }, take: 20 },
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const s = await load((await params).slug);
  return s ? { title: s.name, description: s.description.slice(0, 160) } : { title: "Station" };
}

const dms = (v: number, pos: string, neg: string) => {
  const total = Math.round(Math.abs(v) * 3600);
  const d = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${d}°${String(m).padStart(2, "0")}′${String(s).padStart(2, "0")}″ ${v < 0 ? neg : pos}`;
};

export default async function StationPage({ params }: { params: Promise<{ slug: string }> }) {
  const s = await load((await params).slug);
  if (!s) notFound();
  const color = regionColor(s.region);
  const photo = s.media.find((m) => m.kind === "photo");
  const live = s.liveKey ? (await getLiveReadings()).find((r) => r.key === s.liveKey) : undefined;

  return (
    <>
      <header className="relative isolate min-h-[48vh] flex items-end text-white overflow-hidden">
        <div className="absolute inset-0 -z-10">
          {photo ? (
            <Image src={photo.url} alt={photo.altText} fill priority className="object-cover" sizes="100vw" />
          ) : (
            <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${color}, #07121a)` }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#07121a]/90 via-[#07121a]/30 to-transparent" />
        </div>
        <div className="mx-auto max-w-6xl w-full px-5 pb-10">
          <p className="eyebrow !text-white/80">
            {regionLabel(s.region)} · {s.kind === "historic" ? "Historic base" : "Research station"}
            {s.established ? ` · ${s.established}` : ""}
          </p>
          <h1 className="font-serif text-5xl md:text-7xl tracking-tight mt-2">{s.name}</h1>
          <p className="text-white/85 mt-2">{s.location}</p>
          {photo && <p className="mt-4 text-[11px] text-white/60">Photo: {photo.author} · {photo.license}</p>}
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-12 grid lg:grid-cols-[1.4fr_1fr] gap-12">
        <div>
          <blockquote className="text-xl leading-relaxed text-ink-2 font-serif border-l-2 pl-5" style={{ borderColor: color }}>
            {s.description}
          </blockquote>
          <p className="mt-3 text-xs text-muted">
            Quoted from NCPOR. <a href={s.sourceUrl} target="_blank" rel="noreferrer" className="underline">View the original ↗</a>
          </p>
          <dl className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div className="border-t-2 pt-2" style={{ borderColor: color }}>
              <dt className="text-xs text-muted">Coordinates</dt>
              <dd className="font-serif text-lg">
                {dms(s.lat, "N", "S")}, {dms(s.lng, "E", "W")}
              </dd>
            </div>
            {s.elevation && (
              <div className="border-t-2 pt-2" style={{ borderColor: color }}>
                <dt className="text-xs text-muted">Elevation</dt>
                <dd className="font-serif text-lg">{s.elevation}</dd>
              </div>
            )}
            {live && (
              <div className="border-t-2 pt-2" style={{ borderColor: color }} data-testid="live-reading">
                <dt className="text-xs text-muted">Air temperature now</dt>
                <dd className="font-serif text-lg">{live.tempC.toFixed(1)} °C</dd>
                <dd className="text-[11px] text-muted">
                  {live.observed} ·{" "}
                  <a href={live.liveUrl} target="_blank" rel="noreferrer" className="underline">NCPOR live data ↗</a>
                </dd>
              </div>
            )}
          </dl>

          {s.media.length > 0 && (
            <section className="mt-14" aria-labelledby="media-h">
              <h2 id="media-h" className="font-serif text-3xl">Photos and videos</h2>
              <Gallery items={s.media.map(toGalleryItem)} />
            </section>
          )}

          <section className="mt-14" aria-labelledby="notes-h">
            <h2 id="notes-h" className="font-serif text-3xl mb-2">Field notes</h2>
            <p className="text-sm text-muted mb-6">Logged at the station with the Field app and published after NCPOR review.</p>
            {s.fieldEntries.length === 0 && (
              <p className="card p-6 text-sm text-muted">
                No field notes have been published for {s.name} yet. Working here? <Link href="/field" className="underline">Log one with the Field app</Link>.
              </p>
            )}
            <ol className="space-y-5">
              {s.fieldEntries.map((f) => (
                <li key={f.id} className="card p-5 flex gap-5">
                  {f.photoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={f.photoUrl} alt={`Photo from ${f.activity}`} className="w-28 h-28 rounded-lg object-cover shrink-0" loading="lazy" />
                  )}
                  <div>
                    <p className="eyebrow" style={{ color }}>{f.activity}</p>
                    <p className="mt-2 text-ink-2 leading-relaxed whitespace-pre-line">{f.notes}</p>
                    <p className="text-xs text-muted mt-2">
                      {f.submittedBy} · {f.capturedAt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-10">
          <section aria-labelledby="exp-h">
            <h2 id="exp-h" className="eyebrow mb-3">Expeditions and milestones</h2>
            <ul className="space-y-3">
              {s.expeditions.map((e) => (
                <li key={e.id}>
                  <Link href={e.hasStory ? `/expeditions/${e.slug}/story` : `/expeditions/${e.slug}`} className="card p-4 flex gap-4 hover:border-ink">
                    <span className="font-serif text-2xl w-16 shrink-0">{e.year}</span>
                    <span>
                      <span className="block font-semibold text-sm">{e.shortName}</span>
                      <span className="block text-[11px] uppercase tracking-wider text-muted">{ENTRY_KIND_LABEL[e.kind]}</span>
                      {e.hasStory && <span className="text-[10px] font-bold uppercase text-accent">★ Read the story</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {s.resources.length > 0 && (
            <section aria-labelledby="data-h">
              <h2 id="data-h" className="eyebrow mb-3">Data from this station</h2>
              <ul className="space-y-3">
                {s.resources.map((r) => (
                  <li key={r.id}>
                    <a href={r.url} target="_blank" rel="noreferrer" className="card p-4 block hover:border-ink">
                      <span className="block text-[10px] font-bold uppercase tracking-widest text-muted">{r.kind.replaceAll("-", " ")}</span>
                      <span className="block font-semibold text-sm">{r.title} ↗</span>
                      <span className="block text-xs text-ink-2 mt-1">{r.description}</span>
                    </a>
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-muted mt-3">
                Live readings come from <a href={LIVE_SOURCE_URL} className="underline" target="_blank" rel="noreferrer">NCPOR&apos;s data portal</a>.
              </p>
            </section>
          )}

          <Link href={`/explore?station=${s.slug}`} className="btn btn-ghost">
            See on the map
          </Link>
        </aside>
      </div>
    </>
  );
}
