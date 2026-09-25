import type { SourceDocument } from "./types";

/** Bump when prompts change, so cached outputs can be told apart. */
export const PROMPT_VERSION = "2";

// Kept compact on purpose: free-tier models have small budgets, and the source text is most of the prompt.
// Instructions go in the user turn because some open models (e.g. Gemma) have no system role.
const RULES = `You are the science-communication assistant for India's National Centre for Polar and Ocean Research (NCPOR).
Rewrite the technical document below for non-specialists.
Rules:
- Use ONLY facts stated in the numbered <section>s. Never add facts, numbers, names or claims that are not in them.
- Keep any uncertainty ("early results suggest...").
- "usedSections" must list the number of every section your text relies on, and only those.
- No hype, no invented quotes.
- Reply with ONE JSON object only. No markdown, no code fences, no commentary.`;

const SECTION_CHAR_LIMIT = 1500;

export function renderSources(doc: SourceDocument): string {
  const body = doc.sections
    .map((s) => {
      const text = s.body.length > SECTION_CHAR_LIMIT ? s.body.slice(0, SECTION_CHAR_LIMIT) + "…" : s.body;
      return `<section number="${s.number}" heading="${s.heading.replace(/"/g, "'")}">\n${text}\n</section>`;
    })
    .join("\n");
  return `<document title="${doc.title.replace(/"/g, "'")}" expedition="${doc.expedition}">\n${body}\n</document>`;
}

const EXPLAIN_SHAPE = `{"headline": string, "summary": string (paragraphs separated by \\n\\n), "keyPoints": string[], "whyItMatters": string, "usedSections": string[]}`;
const CAPTION_SHAPE = `{"caption": string, "hashtags": string[], "usedSections": string[]}`;

const AUDIENCE_BRIEF = {
  student:
    "Audience: a curious school student aged 12-16. Short sentences, everyday words, one concrete comparison. Explain any scientific term the first time. headline <= 12 words; summary 2 short paragraphs; exactly 3 keyPoints; whyItMatters 1-2 sentences a student can relate to.",
  public:
    "Audience: an interested adult newspaper reader. Plain but precise; keep key numbers with units. headline <= 14 words; summary 2 paragraphs; 3-4 keyPoints; whyItMatters 1-2 sentences on relevance to India and the world.",
} as const;

const CAPTION_BRIEF =
  "Task: one social-media post for NCPOR's public channels. caption: at most 240 characters, engaging but factual, at most one emoji, includes one concrete finding from the sections. hashtags: 2-4, each starting with #, no spaces. No links and no source line (the system adds the citation).";

export function explainPrompt(doc: SourceDocument, audience: "student" | "public") {
  return `${RULES}\n\n${AUDIENCE_BRIEF[audience]}\n\nJSON shape: ${EXPLAIN_SHAPE}\n\n${renderSources(doc)}`;
}

export function captionPrompt(doc: SourceDocument) {
  return `${RULES}\n\n${CAPTION_BRIEF}\n\nJSON shape: ${CAPTION_SHAPE}\n\n${renderSources(doc)}`;
}
