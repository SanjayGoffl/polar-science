import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { regionColor, regionLabel } from "@/lib/regions";

export const dynamic = "force-dynamic";

async function load(slug: string) {
  return db.station.findUnique({
    where: { slug },
    include: {
      expeditions: { orderBy: { year: "desc" } },
      // Only reviewed field notes are public.
      fieldEntries: { where: { reviewStatus: "approved" }, orderBy: { capturedAt: "desc" }, take: 20 },
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const s = await load((await params).slug);
  return { title: s?.name ?? "Station" };
}

export default async function StationPage({ params }: { params: Promise<{ slug: string }> }) {
  const s = await load((await params).slug);
  if (!s) notFound();
  const color = regionColor(s.region);

  return (
    <>
      <header className="relative isolate min-h-[52vh] flex items-end text-white overflow-hidden">
        <Image src={s.heroImage} alt="" fill priority className="object-cover -z-10" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#07121a]/90 via-[#07121a]/30 to-transparent" />
        <div className="mx-auto max-w-6xl w-full px-5 pb-12">
          <p className="eyebrow !text-white/80">
            {regionLabel(s.region)} · {s.kind === "field-site" ? "Field site" : s.kind === "historic" ? "Historic base" : "Research station"}
            {s.established ? ` · since ${s.established}` : ""}
          </p>
          <h1 className="font-serif text-5xl md:text-7xl tracking-tight mt-2">{s.name}</h1>
          <p className="text-white/85 mt-2">{s.location}</p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-12 grid lg:grid-cols-[1.4fr_1fr] gap-12">
        <div>
          <p className="text-xl leading-relaxed text-ink-2 font-serif">{s.description}</p>
          <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div className="border-t-2 pt-2" style={{ borderColor: color }}>
              <dt className="text-xs text-muted">Coordinates</dt>
              <dd className="font-serif text-lg">
                {Math.abs(s.lat).toFixed(2)}° {s.lat < 0 ? "S" : "N"}, {Math.abs(s.lng).toFixed(2)}° {s.lng < 0 ? "W" : "E"}
              </dd>
            </div>
            <div className="border-t-2 pt-2" style={{ borderColor: color }}>
              <dt className="text-xs text-muted">Expeditions in this portal</dt>
              <dd className="font-serif text-lg">{s.expeditions.length}</dd>
            </div>
          </dl>
          {s.sourceUrl && (
            <p className="mt-4 text-xs text-muted">
              Station name, location and founding year are public facts. See{" "}
              <a href={s.sourceUrl} target="_blank" rel="noreferrer" className="underline">NCPOR ↗</a>. Expedition content linked here is illustrative.
            </p>
          )}

          <h2 className="font-serif text-3xl mt-14 mb-2">Field notes</h2>
          <p className="text-sm text-muted mb-6">Logged at the station through the Field app, and published after NCPOR review.</p>
          {s.fieldEntries.length === 0 && <p className="card p-6 text-sm text-muted">No published field notes yet.</p>}
          <ol className="space-y-5">
            {s.fieldEntries.map((f) => (
              <li key={f.id} className="card p-5 flex gap-5">
                {f.photoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.photoUrl} alt={`Photo from ${f.activity}`} className="w-28 h-28 rounded-lg object-cover shrink-0" />
                )}
                <div>
                  <p className="eyebrow" style={{ color }}>
                    {f.activity}
                  </p>
                  <p className="mt-2 text-ink-2 leading-relaxed">“{f.notes}”</p>
                  <p className="text-xs text-muted mt-2">
                    {f.submittedBy} · {f.capturedAt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <aside>
          <h2 className="eyebrow mb-3">Expeditions</h2>
          <ul className="space-y-3">
            {s.expeditions.map((e) => (
              <li key={e.id}>
                <Link href={e.hasStory ? `/expeditions/${e.slug}/story` : `/expeditions/${e.slug}`} className="card p-4 flex gap-4 hover:border-ink">
                  <span className="font-serif text-2xl w-16 shrink-0">{e.year}</span>
                  <span>
                    <span className="block font-semibold text-sm">{e.shortName}</span>
                    <span className="block text-xs text-muted line-clamp-2">{e.summary}</span>
                    {e.hasStory && <span className="text-[10px] font-bold uppercase text-accent">★ Read the story</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href={`/explore?station=${s.slug}`} className="btn btn-ghost mt-6">
            See on the map
          </Link>
        </aside>
      </div>
    </>
  );
}
