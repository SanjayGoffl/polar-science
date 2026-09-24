import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReportReader } from "@/components/ai/ReportReader";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

async function load(slug: string) {
  return db.report.findUnique({
    where: { slug },
    include: {
      sections: { orderBy: { order: "asc" } },
      expedition: { include: { station: true } },
      project: true,
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const r = await load((await params).slug);
  return { title: r?.title ?? "Report" };
}

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ explain?: string; caption?: string }>;
}) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const r = await load(slug);
  if (!r) notFound();

  return (
    <ReportReader
      report={{
        id: r.id,
        slug: r.slug,
        title: r.title,
        type: r.type,
        authors: r.authors,
        venue: r.venue,
        publishedOn: r.publishedOn.toISOString(),
        abstract: r.abstract,
        project: r.project?.title ?? null,
        expedition: { slug: r.expedition.slug, shortName: r.expedition.shortName, name: r.expedition.name, region: r.expedition.region, hasStory: r.expedition.hasStory },
        station: r.expedition.station.name,
        sections: r.sections.map((s) => ({ id: s.id, number: s.number, heading: s.heading, body: s.body })),
      }}
      autoExplain={sp.explain === "student" || sp.explain === "public" ? sp.explain : null}
      autoCaption={sp.caption === "1"}
    />
  );
}
