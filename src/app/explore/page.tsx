import type { Metadata } from "next";
import { ExploreView } from "@/components/explore/ExploreView";
import { db } from "@/lib/db";
import { stationPhotos, toImage } from "@/lib/queries";
import type { RegionView } from "@/lib/regions";

export const metadata: Metadata = { title: "Explore", description: "India's polar and Himalayan research stations on a map, and every expedition on a timeline." };
export const dynamic = "force-dynamic";

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string; station?: string; expedition?: string }>;
}) {
  const sp = await searchParams;
  const [stations, expeditions, photos] = await Promise.all([
    db.station.findMany({ orderBy: { name: "asc" } }),
    db.expedition.findMany({ orderBy: [{ year: "asc" }, { slug: "asc" }], include: { _count: { select: { reports: true } } } }),
    stationPhotos(),
  ]);

  const region = (["antarctica", "arctic", "himalaya"].includes(sp.region ?? "") ? sp.region : "all") as RegionView;
  const st = sp.station ? stations.find((s) => s.slug === sp.station) : undefined;
  const ex = sp.expedition ? expeditions.find((e) => e.slug === sp.expedition) : undefined;

  return (
    <ExploreView
      stations={stations.map((s) => ({ ...s, photo: toImage(photos.get(s.id)) }))}
      expeditions={expeditions.map(({ _count, ...e }) => ({ ...e, reportCount: _count.reports }))}
      initialRegion={region}
      initialSelection={ex ? { type: "expedition", id: ex.id } : st ? { type: "station", id: st.id } : null}
    />
  );
}
