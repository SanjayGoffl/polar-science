import { cache } from "react";
import { db } from "@/lib/db";

/** Site copy and region text from the database, loaded once per request. */
export const getSiteContent = cache(async () => {
  const [rows, regions] = await Promise.all([db.siteCopy.findMany(), db.region.findMany({ orderBy: { order: "asc" } })]);
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const t = (key: string, fallback = "") => map.get(key) ?? fallback;
  const json = <T,>(key: string, fallback: T): T => {
    try {
      return JSON.parse(map.get(key) ?? "") as T;
    } catch {
      return fallback;
    }
  };
  return { t, json, regions };
});

export type TourStep = { title: string; body: string; href: string; cta: string };
