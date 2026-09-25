import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { StatusBadge } from "@/components/Provenance";
import { db } from "@/lib/db";
import { regionColor, regionLabel } from "@/lib/regions";

export const metadata: Metadata = { title: "Stories" };
export const dynamic = "force-dynamic";

export default async function StoriesPage() {
  const stories = await db.expedition.findMany({
    where: { hasStory: true },
    include: { station: true, _count: { select: { chapters: true, reports: true } } },
    orderBy: { year: "desc" },
  });
  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <p className="eyebrow">Expedition stories</p>
      <h1 className="font-serif text-4xl md:text-5xl tracking-tight">Science told chapter by chapter</h1>
      <p className="text-ink-2 mt-3 max-w-2xl">
        Each story follows one expedition: why it went, what it studied, where, who took part, what it found, and the data and papers it produced.
      </p>
      <ul className="mt-10 grid md:grid-cols-2 gap-6">
        {stories.map((s) => (
          <li key={s.id}>
            <Link href={`/expeditions/${s.slug}/story`} className="group card overflow-hidden flex flex-col h-full hover:border-ink">
              <div className="relative aspect-[16/9]">
                <Image src={s.heroImage} alt="" fill className="object-cover transition duration-700 group-hover:scale-105" />
                <StatusBadge status={s.contentStatus} className="absolute left-3 top-3 bg-white/90" />
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <p className="eyebrow" style={{ color: regionColor(s.region) }}>
                  {regionLabel(s.region)} · {s.station.name} · {s.season}
                </p>
                <h2 className="font-serif text-2xl mt-1 leading-snug">{s.name}</h2>
                <p className="text-sm text-ink-2 mt-2">{s.summary}</p>
                <p className="mt-auto pt-4 text-sm font-semibold text-accent">
                  {s._count.chapters} chapters · {s._count.reports} reports · Read the story →
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
