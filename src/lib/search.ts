import { db } from "@/lib/db";

export interface SearchFilters {
  q: string;
  region?: string;
  year?: number;
}

export interface SearchHit {
  entityType: "station" | "expedition" | "section";
  entityId: string;
  title: string;
  subtitle: string;
  url: string;
  region: string | null;
  year: number | null;
  snippet: string;
}

/** Build an FTS5 MATCH query: each real word becomes a prefix term, ANDed together. */
function toMatchQuery(q: string): string | null {
  const terms = q
    .toLowerCase()
    .match(/[\p{L}\p{N}]+/gu)
    ?.filter((t) => t.length >= 2)
    .map((t) => `"${t.replace(/"/g, '""')}"*`);
  if (!terms || terms.length === 0) return null;
  return terms.join(" ");
}

/**
 * Full-text search over stations, expeditions and report sections (see prisma/migrations/20260927160000_search_fts).
 * Ranked by bm25 with a title match weighted 10x a body match, so "Maitri" finds the station before passing mentions.
 */
export async function searchIndex(filters: SearchFilters): Promise<SearchHit[]> {
  const match = toMatchQuery(filters.q);
  if (!match) return [];

  const conditions = [`"SearchIndex" MATCH ?`];
  const params: (string | number)[] = [match];
  if (filters.region) {
    conditions.push(`region = ?`);
    params.push(filters.region);
  }
  if (filters.year) {
    conditions.push(`year = ?`);
    params.push(filters.year);
  }

  // "Unsafe" only refers to Prisma not knowing the query shape at compile time; every value
  // (match, region, year) is passed as a `?` placeholder below, never string-interpolated.
  const rows = await db.$queryRawUnsafe<
    { entityType: string; entityId: string; title: string; subtitle: string; url: string; region: string | null; year: number | null; snippet: string }[]
  >(
    `SELECT entityType, entityId, title, subtitle, url, region, year,
            snippet("SearchIndex", 3, char(1), char(2), '…', 12) AS snippet
     FROM "SearchIndex"
     WHERE ${conditions.join(" AND ")}
     ORDER BY bm25("SearchIndex", 0, 0, 10.0, 1.0, 0, 0, 0, 0)
     LIMIT 40`,
    ...params,
  );

  return rows.map((r) => ({ ...r, entityType: r.entityType as SearchHit["entityType"] }));
}
