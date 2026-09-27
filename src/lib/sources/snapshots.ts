import { readdirSync, readFileSync } from "node:fs";
import type { DocRef } from "./editorial";
import { buildSections, type BuiltSection } from "./sections";

/** A verbatim source document as saved by scripts/import-sources.mjs. */
export interface Snapshot {
  sourceSystem: string;
  sourceId: string;
  url: string;
  retrievedAt: string;
  contentHash: string;
  publisher: string;
  organisation?: string;
  title: string;
  publishedOn: string | null;
  paragraphs: string[];
}

export type LoadedDoc = Snapshot & { sections: BuiltSection[] };

export const SYSTEMS = ["pib", "ncpor", "ncpor-pdf"] as const;

export function loadSnapshots(root = "data/sources") {
  const docs = new Map<string, LoadedDoc>();
  for (const system of SYSTEMS) {
    let files: string[] = [];
    try {
      files = readdirSync(`${root}/${system}`).filter((f) => f.endsWith(".json"));
    } catch {
      continue;
    }
    for (const f of files) {
      const s = JSON.parse(readFileSync(`${root}/${system}/${f}`, "utf8")) as Snapshot;
      docs.set(`${s.sourceSystem}:${s.sourceId}`, { ...s, sections: buildSections(s.paragraphs) });
    }
  }
  return docs;
}

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

/** Resolve a passage and prove it is really in the source section (whitespace-insensitive). */
export function resolveQuote(docs: Map<string, LoadedDoc>, ref: DocRef, where: string) {
  const doc = docs.get(ref.doc);
  if (!doc) throw new Error(`${where}: unknown document ${ref.doc}`);
  const section = doc.sections.find((s) => s.number === ref.section);
  if (!section) throw new Error(`${where}: ${ref.doc} has no section ${ref.section}`);
  const text = ref.quote ?? section.body;
  if (!norm(section.body).includes(norm(text))) throw new Error(`${where}: quote is not verbatim in ${ref.doc} §${ref.section}`);
  return { doc, section, text: norm(text) === norm(section.body) ? section.body : text };
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90)
    .replace(/-$/, "");
