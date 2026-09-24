import type { SourceSection } from "./types";

export class UngroundedOutputError extends Error {}

/**
 * Map the section numbers a provider claims to have used onto real section IDs.
 * Unknown numbers are dropped; if nothing valid remains the output is rejected —
 * we never store or show text that can't be traced to a source section.
 */
export function resolveCitations(claimed: string[], sections: SourceSection[]): SourceSection[] {
  const byNumber = new Map(sections.map((s) => [s.number, s]));
  const seen = new Set<string>();
  const resolved: SourceSection[] = [];
  for (const raw of claimed) {
    const n = String(raw).replace(/^(§|section)\s*/i, "").trim();
    const s = byNumber.get(n);
    if (s && !seen.has(s.id)) {
      seen.add(s.id);
      resolved.push(s);
    }
  }
  if (!resolved.length) throw new UngroundedOutputError("Generated text did not cite any valid source section.");
  return resolved.sort((a, b) => Number(a.number) - Number(b.number));
}

export function normaliseHashtags(tags: string[]): string[] {
  return [...new Set(tags.map((t) => "#" + t.replace(/^#+/, "").replace(/[^\p{L}\p{N}_]/gu, "")).filter((t) => t.length > 1))].slice(0, 4);
}
