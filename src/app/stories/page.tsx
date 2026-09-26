import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { stationPhotos } from "@/lib/queries";
import { regionColor, regionLabel } from "@/lib/regions";

export const metadata: Metadata = { title: "Stories", description: "Expedition stories told chapter by chapter, quoted from official sources." };
export const dynamic = "force-dynamic";

export default async function StoriesPage() {
  const [stories, photos] = await Promise.all([
    db.expedition.findMany({
      where: { hasStory: true },
      include: { station: true, _count: { select: { chapters: true, reports: true } } },
      orderBy: { year: "desc" },
    }),
    stationPhotos(),
  ]);
  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <p className="eyebrow">Stories</p>
      <h1 className="font-serif text-4xl md:text-5xl tracking-tight">Science told chapter by chapter</h1>
      <p className="text-ink-2 mt-3 max-w-2xl">
        Each story follows one expedition or programme: why it happened, what it studied, where, who took part, and what it found. Every chapter
        quotes an official source and links to it.
      </p>
      <ul className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stories.map((s) => {
          const photo = s.stationId ? photos.get(s.stationId) : undefined;
          return (
            <li key={s.id}>
              <Link href={`/expeditions/${s.slug}/story`} className="group card overflow-hidden flex flex-col h-full hover:border-ink">
                <div className="relative aspect-[16/9] bg-paper-2">
                  {photo ? (
                    <Image src={photo.url} alt={photo.altText} fill className="object-cover transition duration-700 group-hover:scale-105" sizes="(min-width:1024px) 33vw, 100vw" />
                  ) : (
                    <span className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${regionColor(s.region)}, #07121a)` }} />
                  )}
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <p className="eyebrow" style={{ color: regionColor(s.region) }}>
                    {regionLabel(s.region)}
                    {s.station ? ` · ${s.station.name}` : ""} · {s.season ?? s.year}
                  </p>
                  <h2 className="font-serif text-2xl mt-1 leading-snug">{s.name}</h2>
                  <p className="text-sm text-ink-2 mt-2 line-clamp-3">{s.summary}</p>
                  <p className="mt-auto pt-4 text-sm font-semibold text-accent">
                    {s._count.chapters} chapters · {s._count.reports} source documents · Read →
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
