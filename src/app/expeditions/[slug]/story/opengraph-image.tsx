import { db } from "@/lib/db";
import { OG_SIZE, renderShareCard } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const e = await db.expedition.findUnique({ where: { slug: (await params).slug, hasStory: true } });
  if (!e) return renderShareCard({ eyebrow: "Polar Stories", title: "Story not found", quote: "", source: "" });
  return renderShareCard({
    eyebrow: "The story",
    title: e.name,
    quote: e.summary,
    source: `Official source · ${new URL(e.sourceUrl).hostname}`,
  });
}
