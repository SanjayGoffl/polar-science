import { readFileSync } from "node:fs";

/** A passage of a source document: `quote` (optional) must appear verbatim in the section. */
export interface DocRef {
  doc: string; // "pib:1712402" | "ncpor:maitri"
  section: string;
  quote?: string;
}

export interface Editorial {
  stations: {
    slug: string;
    name: string;
    region: "antarctica" | "arctic" | "himalaya";
    kind: "station" | "historic";
    lat: number;
    lng: number;
    established?: string;
    elevation?: string;
    location: string;
    sourceUrl: string;
    liveKey?: string;
    description: DocRef;
  }[];
  entries: {
    slug: string;
    kind: "expedition" | "programme" | "milestone";
    name: string;
    shortName: string;
    number?: number;
    year: number;
    season?: string;
    region: "antarctica" | "arctic" | "himalaya";
    station?: string;
    featured?: boolean;
    summary: DocRef;
    documents: string[];
  }[];
  stories: Record<
    string,
    {
      kind: string;
      title: string;
      doc?: string;
      section?: string;
      quote?: string;
      body?: string;
      focus?: { lat: number; lng: number; zoom: number };
      media?: string;
    }[]
  >;
  media: {
    id: string;
    kind: "photo" | "video";
    title: string;
    caption: string;
    altText: string;
    url: string;
    youtubeId?: string;
    author: string;
    license: string;
    licenseUrl?: string;
    sourceUrl: string;
    station?: string;
    entry?: string;
  }[];
  resources: {
    title: string;
    url: string;
    kind: string;
    description: string;
    publisher: string;
    station?: string;
    entry?: string;
  }[];
  documentTypes: Record<string, string>;
}

/** Editorial mapping plus licensed media metadata (data/sources/media.json). */
export function loadEditorial(root = "data/sources"): Editorial {
  const ed = JSON.parse(readFileSync(`${root}/editorial.json`, "utf8")) as Omit<Editorial, "media">;
  const media = JSON.parse(readFileSync(`${root}/media.json`, "utf8")) as Editorial["media"];
  return { ...ed, media };
}
