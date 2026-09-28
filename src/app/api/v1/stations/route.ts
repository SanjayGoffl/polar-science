import { db } from "@/lib/db";
import { limitPublic, page, parsePageQuery, publicJson } from "@/lib/publicApi";

export const runtime = "nodejs";

/** GET /api/v1/stations?region=&limit=&cursor= — research stations with their official source page. */
export async function GET(req: Request) {
  const limited = limitPublic(req);
  if (limited) return limited;
  const q = parsePageQuery(req);
  if (q instanceof Response) return q;

  const rows = await db.station.findMany({
    where: q.region ? { region: q.region } : undefined,
    orderBy: { id: "asc" },
    take: q.limit + 1,
    ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
    select: {
      id: true,
      slug: true,
      name: true,
      region: true,
      kind: true,
      lat: true,
      lng: true,
      established: true,
      elevation: true,
      location: true,
      description: true,
      sourceUrl: true,
    },
  });
  const origin = new URL(req.url).origin;
  const { data, nextCursor } = page(rows, q.limit);
  return publicJson({ data: data.map((s) => ({ ...s, url: `${origin}/stations/${s.slug}` })), nextCursor });
}
