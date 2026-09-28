import { NextResponse } from "next/server";
import { clientKey, rateLimit } from "@/lib/rateLimit";

const REGIONS = new Set(["antarctica", "arctic", "himalaya"]);

export interface PageQuery {
  limit: number;
  cursor: string | undefined;
  region: string | undefined;
}

/** Parses ?limit=1..100 (default 50), ?cursor=<id from nextCursor>, ?region=antarctica|arctic|himalaya. */
export function parsePageQuery(req: Request): PageQuery | NextResponse {
  const p = new URL(req.url).searchParams;
  const limit = Number(p.get("limit") ?? 50);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) return NextResponse.json({ error: "limit must be an integer from 1 to 100" }, { status: 400 });
  const region = p.get("region") ?? undefined;
  if (region && !REGIONS.has(region)) return NextResponse.json({ error: "region must be antarctica, arctic or himalaya" }, { status: 400 });
  const cursor = p.get("cursor") ?? undefined;
  if (cursor && !/^[a-z0-9]{10,40}$/i.test(cursor)) return NextResponse.json({ error: "invalid cursor" }, { status: 400 });
  return { limit, cursor, region };
}

export function limitPublic(req: Request): NextResponse | null {
  const r = rateLimit(`api:${clientKey(req)}`, 300, 10 * 60_000);
  return r.ok ? null : NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(r.retryAfter) } });
}

/** Fetch limit+1 rows ordered by id; the extra row tells us whether another page exists. */
export function page<T extends { id: string }>(rows: T[], limit: number) {
  const more = rows.length > limit;
  const data = more ? rows.slice(0, limit) : rows;
  return { data, nextCursor: more ? data[data.length - 1].id : null };
}

export function publicJson(body: unknown) {
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
