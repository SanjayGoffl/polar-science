export type AIKind = "explanation" | "caption";
export type Audience = "student" | "public" | "social";

/** A numbered piece of source text the model may cite. */
export interface SourceSection {
  id: string; // ReportSection.id
  number: string; // "3"
  heading: string;
  body: string;
}

export interface SourceDocument {
  title: string;
  kind: string; // expedition-report | publication | ...
  expedition: string; // "ISEA-43"
  sections: SourceSection[];
}

/** Raw provider output — section *numbers*, validated later against the source. */
export interface ExplanationDraft {
  headline: string;
  summary: string;
  keyPoints: string[];
  whyItMatters: string;
  usedSections: string[];
}

export interface CaptionDraft {
  caption: string;
  hashtags: string[];
  usedSections: string[];
}

export interface AIProvider {
  name: "claude" | "mock";
  model: string;
  explain(doc: SourceDocument, audience: "student" | "public"): Promise<ExplanationDraft>;
  caption(doc: SourceDocument): Promise<CaptionDraft>;
}
