export type AIKind = "explanation" | "caption";
export type Audience = "student" | "public" | "social";
export type Language = "en" | "hi";
export type ProviderName = "openrouter" | "gemini" | "offline";

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

export interface Generated<T> {
  draft: T;
  /** The model that actually produced the text (may be a fallback model). */
  model: string;
}

export interface AIProvider {
  name: ProviderName;
  /** Offline is extractive-only and can't translate; it always reports supportsLanguage(hi) === false. */
  supportsLanguage(language: Language): boolean;
  explain(doc: SourceDocument, audience: "student" | "public", language?: Language): Promise<Generated<ExplanationDraft>>;
  caption(doc: SourceDocument, language?: Language): Promise<Generated<CaptionDraft>>;
}
