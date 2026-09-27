import { db } from "@/lib/db";
import { OG_SIZE, renderShareCard } from "@/lib/og";
import { REPORT_TYPE_LABEL } from "@/lib/regions";

export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const r = await db.report.findUnique({ where: { slug: (await params).slug }, include: { sections: { orderBy: { order: "asc" }, take: 1 } } });
  if (!r) return renderShareCard({ eyebrow: "Polar Stories", title: "Document not found", quote: "", source: "" });
  const quote = r.sections[0]?.body ?? r.abstract;
  return renderShareCard({
    eyebrow: REPORT_TYPE_LABEL[r.type] ?? r.type,
    title: r.title,
    quote,
    source: r.publisher,
  });
}
