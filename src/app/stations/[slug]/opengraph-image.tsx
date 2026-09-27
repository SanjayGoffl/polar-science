import { db } from "@/lib/db";
import { OG_SIZE, renderShareCard } from "@/lib/og";
import { regionLabel } from "@/lib/regions";

export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const s = await db.station.findUnique({ where: { slug: (await params).slug } });
  if (!s) return renderShareCard({ eyebrow: "Polar Stories", title: "Station not found", quote: "", source: "" });
  return renderShareCard({
    eyebrow: `${regionLabel(s.region)} · ${s.kind === "historic" ? "Historic base" : "Research station"}`,
    title: s.name,
    quote: s.description,
    source: `NCPOR · ${new URL(s.sourceUrl).hostname}`,
  });
}
