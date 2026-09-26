/**
 * Latest air temperature at NCPOR's stations, as published on NCPOR's meteorological data
 * portal (https://data.ncpor.res.in/). Read server-side, cached for 15 minutes, and never
 * required: if the portal is slow or changes its layout, callers just get an empty result.
 */
export const LIVE_SOURCE_URL = "https://data.ncpor.res.in/";

export interface LiveReading {
  key: string; // maitri | bharati | himansh | himadri
  label: string; // as printed by the portal, e.g. "Antarctica - Maitri"
  tempC: number;
  observed: string; // timestamp text exactly as published
  liveUrl: string;
}

/** Parse the portal's station cards: "<b>Antarctica - Maitri:</b> … <strong>-12.5&deg; C</strong> … <small>…</small>". */
export function parseLiveReadings(html: string): LiveReading[] {
  const out: LiveReading[] = [];
  const re = /<b>\s*([A-Za-z]+)\s*-\s*([A-Za-z]+)\s*:\s*<\/b>[\s\S]{0,400}?<strong>\s*(-?\d+(?:\.\d+)?)\s*&deg;\s*C\s*<\/strong>[\s\S]{0,200}?<small>([^<]+)<\/small>/g;
  for (const m of html.matchAll(re)) {
    const key = m[2].toLowerCase();
    if (out.some((r) => r.key === key)) continue;
    out.push({
      key,
      label: `${m[1]} - ${m[2]}`,
      tempC: Number(m[3]),
      observed: m[4].trim(),
      liveUrl: `${LIVE_SOURCE_URL}${key}/live`,
    });
  }
  return out;
}

export async function getLiveReadings(): Promise<LiveReading[]> {
  try {
    const res = await fetch(LIVE_SOURCE_URL, {
      next: { revalidate: 900 },
      signal: AbortSignal.timeout(4000),
      headers: { "User-Agent": "PolarStories/1.0 (+outreach portal; links back to data.ncpor.res.in)" },
    });
    if (!res.ok) return [];
    return parseLiveReadings(await res.text());
  } catch {
    return [];
  }
}
