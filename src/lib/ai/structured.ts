import { z } from "zod";
import { extractJson, LLMError, type LLMClient } from "./llm";
import { captionPrompt, explainPrompt } from "./prompts";
import type { AIProvider, Language, SourceDocument } from "./types";

const str = z.string().trim().min(1);
const sectionRefs = z.array(z.union([z.string(), z.number()]).transform(String)).min(1);

export const ExplanationSchema = z.object({
  headline: str,
  summary: str,
  keyPoints: z.array(str).min(1).max(6),
  whyItMatters: str,
  usedSections: sectionRefs,
});

export const CaptionSchema = z.object({
  caption: str,
  hashtags: z.array(z.string()).default([]),
  usedSections: sectionRefs,
});

/**
 * Wrap a hosted LLM as an AIProvider. Tries each configured model in order and moves on
 * when a model errors, rate-limits, or returns something that isn't the expected JSON.
 */
export function llmProvider(client: LLMClient): AIProvider {
  async function run<T extends z.ZodTypeAny>(schema: T, prompt: string, maxTokens: number) {
    const errors: string[] = [];
    for (const model of client.models) {
      try {
        const { text, model: used } = await client.complete(prompt, model, { maxTokens });
        const parsed = schema.safeParse(extractJson(text));
        if (!parsed.success) throw new LLMError(`${model}: reply did not match the expected fields`);
        return { draft: parsed.data as z.infer<T>, model: used };
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }
    throw new LLMError(errors.join(" | ") || "No models configured");
  }

  return {
    name: client.name,
    // Hosted models can write Hindi directly; only the offline extractive summariser can't.
    supportsLanguage: (_language: Language) => true,
    explain: (doc: SourceDocument, audience, language: Language = "en") => run(ExplanationSchema, explainPrompt(doc, audience, language), 900),
    caption: (doc: SourceDocument, language: Language = "en") => run(CaptionSchema, captionPrompt(doc, language), 300),
  };
}
