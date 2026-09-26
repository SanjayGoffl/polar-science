import type { Media } from "@/generated/prisma/client";
import type { GalleryItem } from "@/components/story/Gallery";
import type { StoryData, StoryImage } from "@/components/story/StoryView";
import { db } from "@/lib/db";

export function toGalleryItem(m: Media): GalleryItem {
  return {
    id: m.id,
    kind: m.kind as GalleryItem["kind"],
    title: m.title,
    caption: m.caption,
    altText: m.altText,
    url: m.url,
    youtubeId: m.youtubeId,
    author: m.author,
    license: m.license,
    licenseUrl: m.licenseUrl,
    sourceUrl: m.sourceUrl,
  };
}

export const toImage = (m: Media | null | undefined): StoryImage | null =>
  m && m.kind === "photo" ? { url: m.url, alt: m.altText, credit: `${m.author} · ${m.license}` } : null;

/** Photo for a station (first licensed photo attached to it). */
export async function stationPhotos() {
  const photos = await db.media.findMany({ where: { kind: "photo", stationId: { not: null } }, orderBy: { title: "asc" } });
  const map = new Map<string, Media>();
  for (const p of photos) if (!map.has(p.stationId!)) map.set(p.stationId!, p);
  return map;
}

export async function loadStory(slug: string): Promise<StoryData | null> {
  const e = await db.expedition.findUnique({
    where: { slug },
    include: {
      station: true,
      chapters: { orderBy: { order: "asc" }, include: { sourceReport: true } },
      reports: { orderBy: { publishedOn: "asc" } },
      media: true,
      resources: true,
    },
  });
  if (!e || !e.hasStory) return null;

  const stationMedia = e.stationId ? await db.media.findMany({ where: { stationId: e.stationId } }) : [];
  const stationResources = e.stationId ? await db.resource.findMany({ where: { stationId: e.stationId } }) : [];
  const allMedia = [...e.media, ...stationMedia.filter((m) => !e.media.some((x) => x.id === m.id))];
  const chapterMedia = await db.media.findMany({ where: { id: { in: e.chapters.map((c) => c.mediaId).filter(Boolean) as string[] } } });
  const others = await db.expedition.findMany({ where: { hasStory: true, NOT: { id: e.id } }, select: { slug: true, shortName: true }, orderBy: { year: "desc" } });
  const hero = toImage(allMedia.find((m) => m.kind === "photo"));

  return {
    slug: e.slug,
    name: e.name,
    shortName: e.shortName,
    season: e.season,
    region: e.region,
    summary: e.summary,
    sourceUrl: e.sourceUrl,
    hero,
    station: e.station
      ? { slug: e.station.slug, name: e.station.name, location: e.station.location, lat: e.station.lat, lng: e.station.lng, region: e.station.region }
      : null,
    chapters: e.chapters.map((c) => ({
      id: c.id,
      kind: c.kind,
      title: c.title,
      body: c.body,
      citation:
        c.sourceReport && c.sourceSection
          ? {
              reportSlug: c.sourceReport.slug,
              section: c.sourceSection,
              title: c.sourceReport.title,
              publisher: c.sourceReport.publisher,
              publishedOn: c.sourceReport.publishedOn.toISOString(),
              url: c.sourceReport.externalUrl,
            }
          : null,
      focus: c.lat != null && c.lng != null ? { lat: c.lat, lng: c.lng, zoom: c.zoom ?? 6 } : null,
      image: toImage(chapterMedia.find((m) => m.id === c.mediaId)),
    })),
    reports: e.reports.map((r) => ({
      slug: r.slug,
      title: r.title,
      type: r.type,
      publisher: r.publisher,
      publishedOn: r.publishedOn.toISOString(),
      abstract: r.abstract,
      externalUrl: r.externalUrl,
    })),
    media: allMedia.map(toGalleryItem),
    resources: [...e.resources, ...stationResources.filter((r) => !e.resources.some((x) => x.id === r.id))].map((r) => ({
      id: r.id,
      title: r.title,
      url: r.url,
      kind: r.kind,
      description: r.description,
      publisher: r.publisher,
    })),
    others,
  };
}
