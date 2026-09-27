/**
 * Offline, deterministic stand-in for the LLM. It never invents facts: every
 * sentence it outputs is extracted from a source section (with jargon swapped
 * for plain words), and it reports exactly which sections it drew from.
 * Same interface as the Claude provider, so the rest of the app can't tell them apart.
 */
import type { AIProvider, SourceDocument, SourceSection } from "./types";

const GLOSSARY: [RegExp, { student: string; public: string }][] = [
  [/landfast sea ice|fast ice/gi, { student: "sea ice stuck to the coast", public: "landfast (coast-attached) sea ice" }],
  [/stable water isotope \(δ18O\)|δ18O/g, { student: "the ice's oxygen 'fingerprint' (which records past temperature)", public: "oxygen-isotope ratio (a temperature proxy)" }],
  [/ozonesondes?/gi, { student: "weather balloons carrying ozone sensors", public: "balloon-borne ozone sensors" }],
  [/equivalent black carbon \(eBC\)|equivalent black carbon/gi, { student: "soot", public: "black carbon (soot)" }],
  [/m water equivalent|m w\.e\./gi, { student: "m of water (if the snow were melted)", public: "m water equivalent" }],
  [/mass balance/gi, { student: "ice budget (snow gained minus ice lost)", public: "mass balance (ice gained minus ice lost)" }],
  [/Atlantic Water/g, { student: "warm water from the Atlantic Ocean", public: "warm Atlantic Water" }],
  [/terminus/gi, { student: "front edge", public: "front (terminus)" }],
  [/firn/gi, { student: "old, packed snow", public: "firn (compacted snow)" }],
  [/negative freeboard/gi, { student: "ice pushed below the waterline by heavy snow", public: "negative freeboard (ice pressed below sea level)" }],
  [/psychrotolerant/gi, { student: "cold-loving", public: "cold-tolerant" }],
  [/limnological/gi, { student: "lake", public: "lake-science" }],
  [/\bablation\b/gi, { student: "melting", public: "ablation (ice loss)" }],
  [/hypsometry/gi, { student: "shape and height of the glacier", public: "area–elevation distribution" }],
];

// Student-only rewrites: plainer words, drop error bars, small metres to centimetres.
const STUDENT_ONLY: [RegExp, string | ((match: string, ...groups: string[]) => string)][] = [
  [/\s±\s[\d.]+/g, ""],
  [/\b0\.(\d{2}) m\b/g, (_m, d) => `${Number(d)} cm`],
  [/\bapproximately\b/gi, "about"],
  [/\bexhibit(s|ed)?\b/gi, "show$1"],
  [/\brelative to\b/gi, "compared with"],
  [/Mean level-ice thickness/g, "The average thickness of flat sea ice"],
  [/\bmean\b/g, "average"],
  [/\bDU\b/g, "Dobson units"],
  [/‰/g, " parts per thousand"],
  [/\bpersonnel\b/g, "people"],
];

const SKIP_HEADINGS = /data management|archival|instruments|configuration|logistics/i;
const FINDING_HEADINGS = /result|finding|conclusion|implication|significance|observation|thickness|drilling|monitoring|survey|mooring|front/i;

function simplify(text: string, audience: "student" | "public") {
  let out = text;
  for (const [re, rep] of GLOSSARY) out = out.replace(re, rep[audience]);
  if (audience === "student") {
    for (const [re, rep] of STUDENT_ONLY) out = typeof rep === "string" ? out.replace(re, rep) : out.replace(re, rep);
  }
  return out;
}

function sentences(text: string) {
  return text.split(/(?<=[.!?])\s+(?=[A-Z0-9])/).map((s) => s.trim()).filter(Boolean);
}

type Pick = { s: string; section: SourceSection; score: number };

/** Prefer short sentences containing numbers — they carry the findings. One per section, for breadth. */
function pickFindings(sections: SourceSection[], n: number) {
  const best: Pick[] = [];
  for (const section of sections) {
    let top: Pick | null = null;
    for (const s of sentences(section.body)) {
      if (!/\d/.test(s)) continue;
      const score =
        Math.min(s.match(/\d+/g)?.length ?? 0, 4) +
        (/(thinner|earlier|increase|retreat|warming|record|loss|rose|more|longer)/i.test(s) ? 5 : 0) -
        Math.max(0, s.length - 170) / 25;
      if (!top || score > top.score) top = { s, section, score };
    }
    if (top) best.push(top);
  }
  return best.sort((a, b) => b.score - a.score).slice(0, n);
}

function chooseSections(doc: SourceDocument) {
  const usable = doc.sections.filter((s) => !SKIP_HEADINGS.test(s.heading));
  const findings = usable.filter((s) => FINDING_HEADINGS.test(s.heading));
  // Findings sections first, then the rest, so short reports still yield enough points.
  const ordered = [...findings, ...usable.filter((s) => !findings.includes(s))];
  return ordered.length ? ordered : doc.sections;
}

/** Top findings, preferring findings-type sections but topping up from others. */
function findingsFor(doc: SourceDocument, n: number) {
  const sections = chooseSections(doc);
  const primary = sections.filter((s) => FINDING_HEADINGS.test(s.heading));
  const picks = pickFindings(primary.length ? primary : sections, n);
  if (picks.length < n) {
    const rest = sections.filter((s) => !picks.some((p) => p.section.id === s.id));
    picks.push(...pickFindings(rest, n - picks.length));
  }
  return picks;
}

const sentence = (s: string) => (/[.!?…]$/.test(s.trim()) ? s.trim() : s.trim() + ".");
/**
 * Deterministic context trimming for hosted models: the intro plus the sections most likely
 * to hold findings. Cuts prompt size (and cost) for captions, which only need one fact.
 */
export function focusSections(doc: SourceDocument, max = 3): SourceDocument {
  if (doc.sections.length <= max) return doc;
  const keep = new Set([doc.sections[0].id, ...findingsFor(doc, max - 1).map((p) => p.section.id)]);
  return { ...doc, sections: doc.sections.filter((s) => keep.has(s.id)) };
}

const MODEL = "offline-extractive-v1";

const campaignNoun = (doc: SourceDocument) =>
  /himalaya/i.test(doc.expedition) ? "India's Himalayan glacier research campaigns" : "India's polar science expeditions";

export function createOfflineProvider(): AIProvider {
  return {
    name: "offline",

    // Extractive from the (English) source text only — it can't translate, so it never claims to support Hindi.
    supportsLanguage: (language) => language === "en",

    async explain(doc, audience) {
      const intro = doc.sections[0];
      let findings = findingsFor(doc, audience === "student" ? 3 : 4);
      if (!findings.length) findings = [{ s: sentences(intro.body)[0], section: intro, score: 0 }];
      const used = new Set<string>([intro.number, ...findings.map((f) => f.section.number)]);
      const opening = sentences(intro.body)[0];
      const topic = doc.title.split(":").pop()!.trim();

      const summary =
        audience === "student"
          ? `This comes from ${doc.expedition}, one of ${campaignNoun(doc)}. ${simplify(opening, "student")}\n\nThe scientists wanted to measure what is changing in the ice, the ocean or the air, and by how much. Here is what they found.`
          : `${simplify(opening, "public")}\n\nThe document, from ${doc.expedition}, reports field measurements. The key results are summarised below in plain language.`;

      const last = doc.sections[doc.sections.length - 1];
      const closing = sentences(last.body).slice(-1)[0];
      used.add(last.number);

      const draft = {
        headline: audience === "student" ? `What scientists learned: ${topic}` : topic,
        summary,
        keyPoints: findings.map((f) => sentence(simplify(f.s, audience))),
        whyItMatters: sentence(simplify(closing, audience)),
        usedSections: [...used],
      };
      return { draft, model: MODEL };
    },

    async caption(doc) {
      const [top] = findingsFor(doc, 1);
      const pick = top ?? { s: sentences(doc.sections[0].body)[0], section: doc.sections[0], score: 0 };
      const fact = simplify(pick.s, "student");
      const short = fact.length > 170 ? fact.slice(0, fact.lastIndexOf(" ", 167)) + "…" : fact;
      const region = /arctic|svalbard|ny-?[aå]lesund|himadri/i.test(doc.title + pick.s)
        ? "#Arctic"
        : /himalaya|chandra|glacier/i.test(doc.title) && !/antarctic/i.test(doc.title)
          ? "#Himalaya"
          : "#Antarctica";
      const draft = {
        caption: `🧊 New from ${doc.expedition}: ${short}`,
        hashtags: [region, "#NCPOR", "#PolarScience"],
        usedSections: [pick.section.number],
      };
      return { draft, model: MODEL };
    },
  };
}
