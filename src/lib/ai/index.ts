import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { createGeminiClient, createOpenRouterClient } from "./llm";
import { createOfflineProvider, focusSections } from "./offline";
import { PROMPT_VERSION } from "./prompts";
import { llmProvider } from "./structured";
import type { AIKind, AIProvider, Language, SourceDocument } from "./types";
import { normaliseHashtags, resolveCitations } from "./validate";

export type ExplainAudience = "student" | "public";

/**
 * Ordered provider chain from env:
 *   AI_PROVIDER=openrouter (default) → OpenRouter [OPENROUTER_MODEL, OPENROUTER_FALLBACK_MODEL] → Gemini (if keyed) → offline
 *   AI_PROVIDER=gemini                → Gemini → OpenRouter (if keyed) → offline
 *   AI_PROVIDER=offline               → offline summariser only (no network)
 * Providers without an API key are skipped, so the app always works.
 */
export function getProviderChain(env: NodeJS.ProcessEnv = process.env): AIProvider[] {
  const wanted = (env.AI_PROVIDER || "openrouter").toLowerCase();
  const chain: AIProvider[] = [];
  const openrouter = env.OPENROUTER_API_KEY
    ? llmProvider(
        createOpenRouterClient({
          apiKey: env.OPENROUTER_API_KEY,
          model: env.OPENROUTER_MODEL || "nvidia/nemotron-3-super-120b-a12b:free",
          fallbackModel: env.OPENROUTER_FALLBACK_MODEL || "openrouter/free",
          siteUrl: env.SITE_URL,
        }),
      )
    : null;
  const gemini = env.GEMINI_API_KEY
    ? llmProvider(createGeminiClient({ apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL || "gemini-flash-latest" }))
    : null;

  if (wanted === "openrouter") chain.push(...([openrouter, gemini].filter(Boolean) as AIProvider[]));
  else if (wanted === "gemini") chain.push(...([gemini, openrouter].filter(Boolean) as AIProvider[]));
  chain.push(createOfflineProvider());
  return chain;
}

/** Fingerprint of exactly what the model sees; a change invalidates cached outputs. */
export function hashSource(doc: SourceDocument) {
  const h = createHash("sha256");
  h.update(doc.title);
  for (const s of doc.sections) h.update(`\u0000${s.number}\u0000${s.heading}\u0000${s.body}`);
  return h.digest("hex").slice(0, 32);
}

const aiInclude = {
  sources: { include: { section: { select: { id: true, number: true, heading: true } } } },
  sourceReport: { select: { id: true, slug: true, title: true, type: true, contentStatus: true } },
} as const;

async function loadSource(reportId: string) {
  const report = await db.report.findUniqueOrThrow({
    where: { id: reportId },
    include: { sections: { orderBy: { order: "asc" } }, expedition: { select: { shortName: true } } },
  });
  const doc: SourceDocument = {
    title: report.title,
    kind: report.type,
    expedition: report.expedition.shortName,
    sections: report.sections.map((s) => ({ id: s.id, number: s.number, heading: s.heading, body: s.body })),
  };
  return { doc, hash: hashSource(doc) };
}

/** The best existing output for this exact document text: reviewer-approved first, then the newest draft. */
export async function getCachedForReport(opts: { reportId: string; kind: AIKind; audience: ExplainAudience | "social"; language?: Language }) {
  const { hash } = await loadSource(opts.reportId);
  const base = { sourceReportId: opts.reportId, kind: opts.kind, audience: opts.audience, language: opts.language ?? "en", sourceHash: hash };
  return (
    (await db.aIContent.findFirst({ where: { ...base, reviewStatus: "approved" }, orderBy: { reviewedAt: "desc" }, include: aiInclude })) ??
    (await db.aIContent.findFirst({ where: { ...base, reviewStatus: "pending" }, orderBy: { generatedAt: "desc" }, include: aiInclude }))
  );
}

// Identical concurrent requests (e.g. two visitors opening the same report) share one generation.
const inflight = new Map<string, Promise<Awaited<ReturnType<typeof generate>>>>();

export async function generateForReport(opts: {
  reportId: string;
  kind: AIKind;
  audience: ExplainAudience | "social";
  language?: Language;
  regenerate?: boolean;
  chain?: AIProvider[];
}) {
  const key = `${opts.reportId}|${opts.kind}|${opts.audience}|${opts.language ?? "en"}|${opts.regenerate ? "re" : ""}`;
  const existing = inflight.get(key);
  if (existing) return existing;
  const p = generate(opts).finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

async function generate(opts: {
  reportId: string;
  kind: AIKind;
  audience: ExplainAudience | "social";
  language?: Language;
  regenerate?: boolean;
  chain?: AIProvider[];
}) {
  const { reportId, kind, audience } = opts;
  const language: Language = opts.language ?? "en";
  const { doc, hash } = await loadSource(reportId);

  if (!opts.regenerate) {
    // Cache: a reviewer-approved version wins; otherwise the newest unreviewed draft for this exact source text.
    const base = { sourceReportId: reportId, kind, audience, language, sourceHash: hash };
    const cached =
      (await db.aIContent.findFirst({ where: { ...base, reviewStatus: "approved" }, orderBy: { reviewedAt: "desc" }, include: aiInclude })) ??
      (await db.aIContent.findFirst({ where: { ...base, reviewStatus: "pending" }, orderBy: { generatedAt: "desc" }, include: aiInclude }));
    if (cached) return { content: cached, cached: true, fallbackReason: null as string | null };
  }

  const chain = (opts.chain ?? getProviderChain()).filter((p) => p.supportsLanguage(language));
  if (!chain.length) throw new Error(`No configured AI provider can write in "${language}" (the offline summariser is English-only)`);
  // Captions need one fact: send only the intro and likeliest findings sections.
  const input = kind === "caption" ? focusSections(doc, 3) : doc;
  const failures: string[] = [];

  for (const provider of chain) {
    try {
      let text: string;
      let model: string;
      let citedNumbers: string[];
      if (kind === "explanation") {
        const { draft, model: m } = await provider.explain(input, audience as ExplainAudience, language);
        text = [
          draft.headline.trim(),
          draft.summary.trim(),
          draft.keyPoints.map((k) => `• ${k.replace(/^[•\-*]\s*/, "").trim()}`).join("\n"),
          `Why it matters: ${draft.whyItMatters.replace(/^why it matters:\s*/i, "").trim()}`,
        ].join("\n\n");
        model = m;
        citedNumbers = draft.usedSections;
      } else {
        const { draft, model: m } = await provider.caption(input, language);
        // Models sometimes repeat the hashtags inside the caption; keep them in one place.
        const caption = draft.caption.replace(/(\s*#[\p{L}\p{N}_]+)+\s*$/u, "").trim();
        text = `${caption}\n\n${normaliseHashtags(draft.hashtags).join(" ")}`.trim();
        model = m;
        citedNumbers = draft.usedSections;
      }
      // Throws if the output cites nothing real; then the next provider gets a turn.
      const cites = resolveCitations(citedNumbers, input.sections);

      const content = await db.$transaction(async (tx) => {
        const row = await tx.aIContent.create({
          data: {
            kind,
            audience,
            language,
            text,
            provider: provider.name,
            model,
            sourceHash: hash,
            promptVersion: PROMPT_VERSION,
            sourceReportId: reportId,
            sources: { create: cites.map((c) => ({ sectionId: c.id })) },
          },
        });
        return tx.aIContent.findUniqueOrThrow({ where: { id: row.id }, include: aiInclude });
      });
      const fallbackReason = failures.length && provider.name === "offline" ? "Live AI unavailable" : null;
      if (failures.length) console.warn(`[ai] used ${provider.name} after: ${failures.join(" || ")}`);
      return { content, cached: false, fallbackReason };
    } catch (err) {
      failures.push(`${provider.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  throw new Error(failures.join(" || "));
}

export type GeneratedContent = Awaited<ReturnType<typeof generateForReport>>["content"];
