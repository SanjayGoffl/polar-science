import { db } from "@/lib/db";
import { OG_SIZE, renderShareCard } from "@/lib/og";
import { ENTRY_KIND_LABEL, regionLabel } from "@/lib/regions";

export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const e = await db.expedition.findUnique({ where: { slug: (await params).slug } });
  if (!e) return renderShareCard({ eyebrow: "Polar Stories", title: "Expedition not found", quote: "", source: "" });
  return renderShareCard({
    eyebrow: `${ENTRY_KIND_LABEL[e.kind] ?? e.kind} · ${regionLabel(e.region)}`,
    title: e.name,
    quote: e.summary,
    source: `Official source · ${new URL(e.sourceUrl).hostname}`,
  });
}
