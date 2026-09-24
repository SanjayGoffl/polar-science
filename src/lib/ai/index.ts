import { db } from "@/lib/db";
import { createClaudeProvider } from "./claude";
import { createMockProvider } from "./mock";
import type { AIKind, AIProvider, SourceDocument } from "./types";
import { normaliseHashtags, resolveCitations } from "./validate";

export type ExplainAudience = "student" | "public";

export function getProvider(): AIProvider {
  const wanted = (process.env.AI_PROVIDER ?? "claude").toLowerCase();
  if (wanted === "claude" && (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN)) {
    return createClaudeProvider(process.env.ANTHROPIC_MODEL || "claude-opus-5");
  }
  return createMockProvider();
}

const aiInclude = {
  sources: { include: { section: { select: { id: true, number: true, heading: true } } } },
  sourceReport: { select: { id: true, slug: true, title: true, type: true } },
} as const;

async function loadSource(reportId: string): Promise<{ doc: SourceDocument; reportId: string }> {
  const report = await db.report.findUniqueOrThrow({
    where: { id: reportId },
    include: { sections: { orderBy: { order: "asc" } }, expedition: { select: { shortName: true } } },
  });
  return {
    reportId: report.id,
    doc: {
      title: report.title,
      kind: report.type,
      expedition: report.expedition.shortName,
      sections: report.sections.map((s) => ({ id: s.id, number: s.number, heading: s.heading, body: s.body })),
    },
  };
}

/**
 * Generate (or reuse a cached) explanation/caption for a report.
 * The row and its section-level citations are written in one transaction;
 * the DB's CHECK constraint guarantees the row has a source.
 */
export async function generateForReport(opts: {
  reportId: string;
  kind: AIKind;
  audience: ExplainAudience | "social";
  regenerate?: boolean;
}) {
  const { reportId, kind, audience } = opts;

  if (!opts.regenerate) {
    const cached = await db.aIContent.findFirst({
      where: { sourceReportId: reportId, kind, audience, reviewStatus: { not: "rejected" } },
      orderBy: { generatedAt: "desc" },
      include: aiInclude,
    });
    if (cached) return { content: cached, cached: true, fallbackReason: null as string | null };
  }

  const { doc } = await loadSource(reportId);
  let provider = getProvider();
  let fallbackReason: string | null = null;

  const produce = async (p: AIProvider) => {
    if (kind === "explanation") {
      const d = await p.explain(doc, audience as ExplainAudience);
      const cites = resolveCitations(d.usedSections, doc.sections);
      const text = [
        d.headline.trim(),
        d.summary.trim(),
        d.keyPoints.map((k) => `• ${k.trim()}`).join("\n"),
        `Why it matters: ${d.whyItMatters.trim()}`,
      ].join("\n\n");
      return { text, cites };
    }
    const d = await p.caption(doc);
    const cites = resolveCitations(d.usedSections, doc.sections);
    return { text: `${d.caption.trim()}\n\n${normaliseHashtags(d.hashtags).join(" ")}`, cites };
  };

  let result: Awaited<ReturnType<typeof produce>>;
  try {
    result = await produce(provider);
  } catch (err) {
    if (provider.name === "mock") throw err;
    // Live demo resilience: if the API is unreachable, fall back to the offline
    // provider — and say so honestly in the response.
    fallbackReason = err instanceof Error ? err.message : "AI service unavailable";
    console.warn("[ai] Claude call failed, using offline provider:", fallbackReason);
    provider = createMockProvider();
    result = await produce(provider);
  }

  const content = await db.$transaction(async (tx) => {
    const row = await tx.aIContent.create({
      data: {
        kind,
        audience,
        text: result.text,
        provider: provider.name,
        model: provider.model,
        sourceReportId: reportId,
        sources: { create: result.cites.map((c) => ({ sectionId: c.id })) },
      },
    });
    return tx.aIContent.findUniqueOrThrow({ where: { id: row.id }, include: aiInclude });
  });

  return { content, cached: false, fallbackReason };
}

export type GeneratedContent = Awaited<ReturnType<typeof generateForReport>>["content"];
