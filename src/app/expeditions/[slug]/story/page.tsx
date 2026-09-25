import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StoryView, type StoryData } from "@/components/story/StoryView";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

async function load(slug: string) {
  return db.expedition.findUnique({
    where: { slug },
    include: {
      station: true,
      chapters: { orderBy: { order: "asc" } },
      projects: true,
      members: { include: { person: true } },
      reports: { orderBy: [{ type: "asc" }, { publishedOn: "asc" }] },
      media: true,
      dataProducts: true,
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const e = await load((await params).slug);
  return { title: e ? `${e.shortName} — the story` : "Story" };
}

export default async function StoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const e = await load((await params).slug);
  if (!e || !e.hasStory) notFound();

  const others = await db.expedition.findMany({
    where: { hasStory: true, NOT: { id: e.id } },
    select: { slug: true, shortName: true, name: true, heroImage: true, summary: true },
  });

  const data: StoryData = {
    slug: e.slug,
    name: e.name,
    shortName: e.shortName,
    season: e.season,
    region: e.region,
    summary: e.summary,
    contentStatus: e.contentStatus,
    sourceUrl: e.sourceUrl,
    heroImage: e.heroImage,
    station: { slug: e.station.slug, name: e.station.name, location: e.station.location, lat: e.station.lat, lng: e.station.lng, region: e.station.region },
    chapters: e.chapters.map((c) => ({
      id: c.id,
      kind: c.kind,
      eyebrow: c.eyebrow,
      title: c.title,
      body: c.body,
      image: c.image,
      focus: c.lat != null && c.lng != null ? { lat: c.lat, lng: c.lng, zoom: c.zoom ?? 6 } : null,
      stats: c.stats ? (JSON.parse(c.stats) as { label: string; value: string }[]) : [],
    })),
    projects: e.projects.map((p) => ({ id: p.id, title: p.title, topic: p.topic, lead: p.lead, summary: p.summary })),
    team: e.members.map((m) => ({ id: m.personId, name: m.person.name, role: m.role, institution: m.person.institution, expertise: m.person.expertise })),
    reports: e.reports.map((r) => ({ slug: r.slug, title: r.title, type: r.type, authors: r.authors, venue: r.venue, publishedOn: r.publishedOn.toISOString(), abstract: r.abstract })),
    media: e.media.map((m) => ({ id: m.id, url: m.url, caption: m.caption, altText: m.altText, credit: m.credit })),
    data: e.dataProducts.map((d) => ({ id: d.id, title: d.title, parameter: d.parameter, format: d.format, volume: d.volume, npdcUrl: d.npdcUrl })),
    others,
  };

  return <StoryView story={data} />;
}
