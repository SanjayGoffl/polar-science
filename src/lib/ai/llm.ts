/**
 * Minimal HTTP clients for hosted LLMs. No SDKs: both APIs are simple JSON over fetch.
 * Each client exposes an ordered list of models; callers try them in turn.
 */

export class LLMError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

export interface LLMClient {
  name: "openrouter" | "gemini";
  models: string[];
  complete(prompt: string, model: string, opts?: { maxTokens?: number }): Promise<{ text: string; model: string }>;
}

const TIMEOUT_MS = 30_000;

export function createOpenRouterClient(opts: {
  apiKey: string;
  model: string;
  fallbackModel?: string;
  siteUrl?: string;
  fetchImpl?: typeof fetch;
}): LLMClient {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const models = [...new Set([opts.model, opts.fallbackModel].filter(Boolean) as string[])];
  return {
    name: "openrouter",
    models,
    async complete(prompt, model, { maxTokens = 900 } = {}) {
      const res = await fetchImpl("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${opts.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": opts.siteUrl ?? "http://localhost:3000",
          "X-Title": "Polar Stories (NCPOR outreach)",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens: maxTokens,
          response_format: { type: "json_object" },
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const json = (await res.json().catch(() => null)) as {
        model?: string;
        error?: { message?: string };
        choices?: { message?: { content?: string | null } }[];
      } | null;
      if (!res.ok || json?.error) {
        throw new LLMError(`OpenRouter ${model}: ${json?.error?.message ?? `HTTP ${res.status}`}`, res.status);
      }
      const text = json?.choices?.[0]?.message?.content ?? "";
      if (!text.trim()) throw new LLMError(`OpenRouter ${model}: empty response`);
      return { text, model: json?.model ?? model };
    },
  };
}

export function createGeminiClient(opts: { apiKey: string; model: string; fetchImpl?: typeof fetch }): LLMClient {
  const fetchImpl = opts.fetchImpl ?? fetch;
  return {
    name: "gemini",
    models: [opts.model],
    async complete(prompt, model, { maxTokens = 900 } = {}) {
      const res = await fetchImpl(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": opts.apiKey },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: maxTokens, responseMimeType: "application/json" },
          }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        },
      );
      const json = (await res.json().catch(() => null)) as {
        error?: { message?: string };
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      } | null;
      if (!res.ok || json?.error) throw new LLMError(`Gemini ${model}: ${json?.error?.message ?? `HTTP ${res.status}`}`, res.status);
      const text = (json?.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
      if (!text.trim()) throw new LLMError(`Gemini ${model}: empty response`);
      return { text, model };
    },
  };
}

/** Pull the first JSON object out of a model reply (tolerates code fences and stray prose). */
export function extractJson(text: string): unknown {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        /* fall through */
      }
    }
    throw new LLMError("Model reply was not valid JSON");
  }
}
