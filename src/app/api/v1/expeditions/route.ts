import { db } from "@/lib/db";
import { limitPublic, page, parsePageQuery, publicJson } from "@/lib/publicApi";

export const runtime = "nodejs";

/** GET /api/v1/expeditions?region=&limit=&cursor= — expeditions, programmes and milestones with cited sources. */
export async function GET(req: Request) {
  const limited = limitPublic(req);
  if (limited) return limited;
  const q = parsePageQuery(req);
  if (q instanceof Response) return q;

  const rows = await db.expedition.findMany({
    where: q.region ? { region: q.region } : undefined,
    orderBy: { id: "asc" },
    take: q.limit + 1,
    ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
    select: {
      id: true,
      slug: true,
      kind: true,
      name: true,
      shortName: true,
      number: true,
      year: true,
      season: true,
      region: true,
      summary: true,
      sourceUrl: true,
      hasStory: true,
      station: { select: { slug: true, name: true } },
      reports: { select: { title: true, publisher: true, publishedOn: true, externalUrl: true, retrievedAt: true } },
    },
  });
  const origin = new URL(req.url).origin;
  const { data, nextCursor } = page(rows, q.limit);
  return publicJson({
    data: data.map((e) => ({ ...e, url: `${origin}/expeditions/${e.slug}${e.hasStory ? "/story" : ""}` })),
    nextCursor,
  });
}
