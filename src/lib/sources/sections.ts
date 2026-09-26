/**
 * Turn a source document's paragraphs into numbered, citable sections.
 * Text is never rewritten: list items like "(ii) …" are only joined to the paragraph that
 * introduces them, and each section's heading is its own opening words.
 */
export interface BuiltSection {
  number: string;
  heading: string;
  body: string;
}

const LIST_ITEM = /^\(?([ivxlc]+|[a-z]|\d{1,2})\)\s/i;

export function headingFor(body: string, max = 72) {
  const first = body.split("\n")[0].split(/(?<=[.!?:])\s/)[0].replace(/[:.]$/, "");
  if (first.length <= max) return first;
  const cut = first.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(" ")) + "…";
}

export function buildSections(paragraphs: string[]): BuiltSection[] {
  const blocks: string[] = [];
  for (const p of paragraphs.map((x) => x.trim()).filter(Boolean)) {
    const prev = blocks.at(-1);
    // A lead-in ("… are:") always opens a new section; list items join the section above them.
    const continuesList = prev !== undefined && !p.endsWith(":") && (LIST_ITEM.test(p) || prev.endsWith(":"));
    if (continuesList) blocks[blocks.length - 1] = `${prev}\n${p}`;
    else blocks.push(p);
  }
  return blocks.map((body, i) => ({ number: String(i + 1), heading: headingFor(body), body }));
}
