import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { AUDIENCE_BRIEF, CAPTION_BRIEF, renderSources, SYSTEM_PROMPT } from "./prompts";
import type { AIProvider, SourceDocument } from "./types";

const ExplanationSchema = z.object({
  headline: z.string(),
  summary: z.string(),
  keyPoints: z.array(z.string()),
  whyItMatters: z.string(),
  usedSections: z.array(z.string()),
});

const CaptionSchema = z.object({
  caption: z.string(),
  hashtags: z.array(z.string()),
  usedSections: z.array(z.string()),
});

export function createClaudeProvider(model: string): AIProvider {
  const client = new Anthropic();

  async function run<T extends z.ZodTypeAny>(schema: T, doc: SourceDocument, brief: string): Promise<z.infer<T>> {
    const response = await client.messages.parse({
      model,
      max_tokens: 4000,
      output_config: { effort: "low", format: zodOutputFormat(schema) },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `${renderSources(doc)}\n\n${brief}` }],
    });
    if (response.stop_reason === "refusal") throw new Error("The model declined to process this document.");
    if (!response.parsed_output) throw new Error("The model returned output that did not match the expected format.");
    return response.parsed_output;
  }

  return {
    name: "claude",
    model,
    explain: (doc, audience) => run(ExplanationSchema, doc, AUDIENCE_BRIEF[audience]),
    caption: (doc) => run(CaptionSchema, doc, CAPTION_BRIEF),
  };
}
