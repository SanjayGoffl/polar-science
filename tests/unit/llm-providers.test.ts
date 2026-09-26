import { describe, expect, it, vi } from "vitest";
import { getProviderChain } from "@/lib/ai";
import { createGeminiClient, createOpenRouterClient, extractJson } from "@/lib/ai/llm";
import { focusSections } from "@/lib/ai/offline";
import { llmProvider } from "@/lib/ai/structured";
import type { SourceDocument } from "@/lib/ai/types";

const doc: SourceDocument = {
  title: "Report",
  kind: "expedition-report",
  expedition: "ISEA-43",
  sections: [
    { id: "a", number: "1", heading: "Introduction", body: "Team of 38 arrived on 29 November." },
    { id: "b", number: "2", heading: "Thickness results", body: "Ice was 1.62 m thick, 0.18 m thinner than usual." },
    { id: "c", number: "3", heading: "Data management", body: "Archived in 2024." },
    { id: "d", number: "4", heading: "Ozone observations", body: "Ozone rose from 262 DU to 309 DU." },
    { id: "e", number: "5", heading: "Conclusions", body: "Continued monitoring needed." },
  ],
};

const explanation = { headline: "H", summary: "S", keyPoints: ["k"], whyItMatters: "W", usedSections: ["2"] };
const orReply = (content: string, model = "google/gemma-4-31b-it:free") =>
  new Response(JSON.stringify({ model, choices: [{ message: { content } }] }), { status: 200 });

describe("OpenRouter provider", () => {
  it("sends the primary model with a bearer key and returns parsed JSON", async () => {
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => orReply(JSON.stringify(explanation)));
    const p = llmProvider(createOpenRouterClient({ apiKey: "k", model: "google/gemma-4-31b-it:free", fallbackModel: "openrouter/free", fetchImpl }));
    const out = await p.explain(doc, "student");
    expect(out.draft.usedSections).toEqual(["2"]);
    expect(out.model).toBe("google/gemma-4-31b-it:free");
    const [url, init] = fetchImpl.mock.calls[0];
    expect(String(url)).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect((init!.headers as Record<string, string>).Authorization).toBe("Bearer k");
    expect(JSON.parse(String(init!.body)).model).toBe("google/gemma-4-31b-it:free");
  });

  it("falls back to the second model on a rate limit", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: "rate limited" } }), { status: 429 }))
      .mockResolvedValueOnce(orReply(JSON.stringify(explanation), "some/free-model"));
    const p = llmProvider(createOpenRouterClient({ apiKey: "k", model: "a", fallbackModel: "openrouter/free", fetchImpl }));
    const out = await p.explain(doc, "public");
    expect(out.model).toBe("some/free-model");
    expect(JSON.parse(String(fetchImpl.mock.calls[1][1].body)).model).toBe("openrouter/free");
  });

  it("falls back when a model replies with malformed JSON", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(orReply("Sure! Here is a summary without JSON."))
      .mockResolvedValueOnce(orReply("```json\n" + JSON.stringify(explanation) + "\n```"));
    const p = llmProvider(createOpenRouterClient({ apiKey: "k", model: "a", fallbackModel: "b", fetchImpl }));
    await expect(p.explain(doc, "student")).resolves.toMatchObject({ draft: { headline: "H" } });
  });

  it("throws when every model fails, so the next provider can take over", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 503 }));
    const p = llmProvider(createOpenRouterClient({ apiKey: "k", model: "a", fallbackModel: "b", fetchImpl }));
    await expect(p.caption(doc)).rejects.toThrow(/a:.*b:/s);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

describe("Gemini provider", () => {
  it("calls generateContent with the API key header and JSON mode", async () => {
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ caption: "c", hashtags: ["x"], usedSections: [2] }) }] } }] })),
    );
    const p = llmProvider(createGeminiClient({ apiKey: "g", model: "gemini-flash-latest", fetchImpl }));
    const out = await p.caption(doc);
    expect(out.draft.usedSections).toEqual(["2"]);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(String(url)).toContain("models/gemini-flash-latest:generateContent");
    expect((init!.headers as Record<string, string>)["x-goog-api-key"]).toBe("g");
    expect(JSON.parse(String(init!.body)).generationConfig.responseMimeType).toBe("application/json");
  });
});

describe("provider chain", () => {
  it("defaults to OpenRouter, then Gemini, then offline", () => {
    const chain = getProviderChain({ OPENROUTER_API_KEY: "a", GEMINI_API_KEY: "b" } as unknown as NodeJS.ProcessEnv);
    expect(chain.map((p) => p.name)).toEqual(["openrouter", "gemini", "offline"]);
  });

  it("skips providers with no key", () => {
    expect(getProviderChain({ AI_PROVIDER: "openrouter" } as unknown as NodeJS.ProcessEnv).map((p) => p.name)).toEqual(["offline"]);
  });

  it("honours AI_PROVIDER=gemini and AI_PROVIDER=offline", () => {
    const env = { OPENROUTER_API_KEY: "a", GEMINI_API_KEY: "b" };
    expect(getProviderChain({ ...env, AI_PROVIDER: "gemini" } as unknown as NodeJS.ProcessEnv).map((p) => p.name)).toEqual(["gemini", "openrouter", "offline"]);
    expect(getProviderChain({ ...env, AI_PROVIDER: "offline" } as unknown as NodeJS.ProcessEnv).map((p) => p.name)).toEqual(["offline"]);
  });
});

describe("token-saving helpers", () => {
  it("extractJson tolerates fences and surrounding prose", () => {
    expect(extractJson('Here you go:\n```json\n{"a":1}\n```\nThanks')).toEqual({ a: 1 });
    expect(() => extractJson("no json here")).toThrow();
  });

  it("focusSections keeps the intro plus the likeliest findings sections", () => {
    const focused = focusSections(doc, 3);
    expect(focused.sections).toHaveLength(3);
    expect(focused.sections[0].number).toBe("1");
    expect(focused.sections.map((s) => s.heading)).not.toContain("Data management");
  });
});
