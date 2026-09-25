"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReaderReport } from "./ReportReader";

type Tab = "explain" | "caption";
type Audience = "student" | "public";

interface AIContentDTO {
  id: string;
  kind: "explanation" | "caption";
  audience: string;
  text: string;
  provider: string;
  model: string;
  generatedAt: string;
  reviewStatus: string;
  editedByReviewer: boolean;
  sources: { section: { id: string; number: string; heading: string } }[];
  sourceReport: { id: string; slug: string; title: string; type: string } | null;
}

interface Result {
  content: AIContentDTO;
  cached: boolean;
  canRegenerate?: boolean;
  fallbackReason: string | null;
}

const key = (tab: Tab, audience: Audience) => (tab === "caption" ? "caption" : `explain-${audience}`);

export function AIPanel({
  report,
  autoExplain,
  autoCaption,
  onCitations,
  onJump,
}: {
  report: ReaderReport;
  autoExplain: Audience | null;
  autoCaption: boolean;
  onCitations: (numbers: string[]) => void;
  onJump: (number: string) => void;
}) {
  const [tab, setTab] = useState<Tab>(autoCaption ? "caption" : "explain");
  const [audience, setAudience] = useState<Audience>(autoExplain ?? "student");
  const [results, setResults] = useState<Record<string, Result>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const current = results[key(tab, audience)];

  const generate = useCallback(
    async (t: Tab, a: Audience, regenerate = false) => {
      const k = key(t, a);
      setLoading(k);
      setError(null);
      try {
        const res = await fetch("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reportId: report.id,
            kind: t === "caption" ? "caption" : "explanation",
            audience: t === "caption" ? "social" : a,
            regenerate,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Generation failed");
        setResults((r) => ({ ...r, [k]: json }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Generation failed");
      } finally {
        setLoading(null);
      }
    },
    [report.id],
  );

  // Deep links (?explain=student / ?caption=1) start generation immediately.
  useEffect(() => {
    if (autoExplain) generate("explain", autoExplain);
    else if (autoCaption) generate("caption", "student");
  }, [autoExplain, autoCaption, generate]);

  useEffect(() => {
    onCitations(current ? current.content.sources.map((s) => s.section.number) : []);
  }, [current, onCitations]);

  function switchTo(t: Tab, a: Audience) {
    setTab(t);
    setAudience(a);
    // Toggling audience on an explanation already shown regenerates for the new audience automatically.
    if (!results[key(t, a)] && (t === "caption" || results[key("explain", a === "student" ? "public" : "student")])) generate(t, a);
  }

  const isLoading = loading === key(tab, audience);

  return (
    <aside className="lg:sticky lg:top-24 card overflow-hidden shadow-lg lg:max-h-[calc(100vh-7rem)] flex flex-col" aria-label="AI explanation and caption tools">
      <div className="bg-ink text-paper px-5 pt-5 pb-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-paper/60">✦ Understand & share</p>
        <div role="tablist" className="mt-3 grid grid-cols-2 gap-1 rounded-full bg-white/10 p-1 text-sm font-semibold">
          <button role="tab" aria-selected={tab === "explain"} onClick={() => switchTo("explain", audience)} className={`rounded-full py-1.5 ${tab === "explain" ? "bg-paper text-ink" : "text-paper/80"}`}>
            Explain simply
          </button>
          <button role="tab" aria-selected={tab === "caption"} onClick={() => switchTo("caption", audience)} className={`rounded-full py-1.5 ${tab === "caption" ? "bg-paper text-ink" : "text-paper/80"}`}>
            Social caption
          </button>
        </div>
      </div>

      <div className="p-5 overflow-y-auto">
        {tab === "explain" && (
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-muted">Written for</span>
            <div role="radiogroup" aria-label="Audience" className="flex rounded-full border border-line p-0.5 text-xs font-semibold">
              {(["student", "public"] as Audience[]).map((a) => (
                <button
                  key={a}
                  role="radio"
                  aria-checked={audience === a}
                  onClick={() => switchTo("explain", a)}
                  className={`rounded-full px-3 py-1 ${audience === a ? "bg-ink text-paper" : "text-ink-2"}`}
                >
                  {a === "student" ? "🎒 Students" : "General public"}
                </button>
              ))}
            </div>
          </div>
        )}

        {!current && !isLoading && (
          <div className="text-center py-6">
            <p className="font-serif text-xl leading-snug">
              {tab === "explain" ? "Turn this technical report into plain language." : "Draft a ready-to-post social caption."}
            </p>
            <p className="text-sm text-muted mt-2">Every sentence is grounded in this document, and the sections it used are cited.</p>
            <button onClick={() => generate(tab, audience)} className="btn btn-accent mt-5">
              {tab === "explain" ? `✦ Explain this simply` : "✦ Generate social caption"}
            </button>
          </div>
        )}

        {isLoading && <LoadingState sections={report.sections.length} tab={tab} />}

        {error && !isLoading && (
          <div role="alert" className="rounded-lg bg-accent/10 text-accent-2 text-sm p-3 mb-3">
            {error}{" "}
            <button className="underline font-semibold" onClick={() => generate(tab, audience)}>
              Try again
            </button>
          </div>
        )}

        {current && !isLoading && (
          <div className="fade-in" key={current.content.id}>
            {current.fallbackReason && (
              <p className="text-xs rounded-lg bg-warn/10 text-warn p-2.5 mb-3">
                The live AI service was unavailable, so this came from the offline summariser. It only extracts and simplifies sentences from the report.
              </p>
            )}
            {tab === "explain" ? <Explanation text={current.content.text} /> : <CaptionCard text={current.content.text} report={report} content={current.content} />}
            <SourceBox content={current.content} report={report} onJump={onJump} />
            <Provenance result={current} onRegenerate={() => generate(tab, audience, true)} />
          </div>
        )}
      </div>
    </aside>
  );
}

function LoadingState({ sections, tab }: { sections: number; tab: Tab }) {
  return (
    <div className="py-4" aria-live="polite">
      <p className="text-sm text-muted mb-4">
        Reading {sections} sections and {tab === "explain" ? "writing a plain-language version" : "drafting a caption"}…
      </p>
      <div className="space-y-2.5 animate-pulse">
        <div className="h-5 bg-paper-2 rounded w-3/4" />
        <div className="h-3 bg-paper-2 rounded" />
        <div className="h-3 bg-paper-2 rounded w-11/12" />
        <div className="h-3 bg-paper-2 rounded w-4/5" />
      </div>
    </div>
  );
}

function Explanation({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  const [headline, ...rest] = blocks;
  return (
    <div>
      <h3 className="font-serif text-2xl leading-snug">{headline}</h3>
      {rest.map((b, i) => {
        if (b.split("\n").every((l) => l.startsWith("• "))) {
          return (
            <ul key={i} className="mt-4 space-y-2">
              {b.split("\n").map((l, j) => (
                <li key={j} className="flex gap-2.5 text-sm leading-relaxed">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                  <span>{l.slice(2)}</span>
                </li>
              ))}
            </ul>
          );
        }
        if (b.startsWith("Why it matters:")) {
          return (
            <p key={i} className="mt-4 text-sm leading-relaxed rounded-lg bg-ice/60 p-3">
              <strong>Why it matters: </strong>
              {b.slice("Why it matters:".length).trim()}
            </p>
          );
        }
        return (
          <p key={i} className="mt-3 text-[15px] leading-relaxed text-ink-2">
            {b}
          </p>
        );
      })}
    </div>
  );
}

function citationLine(content: AIContentDTO, report: ReaderReport) {
  const secs = content.sources.map((s) => `§${s.section.number}`).join(", ");
  const url = typeof window !== "undefined" ? `${window.location.origin}/reports/${report.slug}` : `/reports/${report.slug}`;
  const line = `Source: ${report.expedition.shortName}, “${report.title}” ${secs} — ${url}`;
  // Never let sample content leave the portal looking like an official NCPOR finding.
  return report.contentStatus === "official" ? line : `${line}
[Illustrative sample content, not an official NCPOR finding]`;
}

function CaptionCard({ text, report, content }: { text: string; report: ReaderReport; content: AIContentDTO }) {
  const [copied, setCopied] = useState(false);
  const [caption, tags = ""] = text.split(/\n{2,}/);
  const full = `${caption}\n\n${tags}\n\n${citationLine(content, report)}`;

  async function copy() {
    await navigator.clipboard.writeText(full);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div>
      <div className="rounded-xl border border-line p-4 bg-white">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-full bg-ink grid place-items-center text-paper text-xs font-bold">NC</span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold">NCPOR Outreach</span>
            <span className="block text-xs text-muted">Draft post · not published</span>
          </span>
        </div>
        <p className="mt-3 text-[15px] leading-relaxed">{caption}</p>
        <p className="mt-2 text-sm text-antarctica font-medium">{tags}</p>
        <p className="mt-3 text-xs text-muted border-t border-line pt-2 whitespace-pre-line">📄 {citationLine(content, report)}</p>
      </div>
      <div className="flex items-center justify-between mt-3">
        <span className={`text-xs ${caption.length + tags.length > 280 ? "text-accent" : "text-muted"}`}>
          {caption.length + tags.length + 1} characters (post text + hashtags)
        </span>
        <button onClick={copy} className="btn btn-primary !py-1.5 !px-3.5 !text-xs">
          {copied ? "✓ Copied with source" : "Copy post"}
        </button>
      </div>
    </div>
  );
}

function SourceBox({ content, report, onJump }: { content: AIContentDTO; report: ReaderReport; onJump: (n: string) => void }) {
  return (
    <div className="mt-5 rounded-xl border-2 border-dashed border-line p-4">
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted">Based on</p>
      <p className="text-sm font-semibold mt-1 leading-snug">
        {report.expedition.shortName} · {report.title}
      </p>
      {report.contentStatus !== "official" && (
        <p className="mt-1 text-[11px] font-semibold text-warn">Illustrative sample document (prototype data, not an NCPOR publication)</p>
      )}
      <ul className="mt-2 space-y-1">
        {content.sources.map((s) => (
          <li key={s.section.id}>
            <button onClick={() => onJump(s.section.number)} className="text-sm text-antarctica hover:underline text-left">
              §{s.section.number} {s.section.heading} ↓
            </button>
          </li>
        ))}
      </ul>
      <a href={`/reports/${report.slug}#section-${content.sources[0]?.section.number ?? 1}`} className="inline-block mt-3 text-xs font-semibold underline underline-offset-4">
        View original source
      </a>
    </div>
  );
}

const PROVIDER_LABEL: Record<string, string> = { openrouter: "OpenRouter", gemini: "Gemini", mock: "Offline summariser" };

function Provenance({ result, onRegenerate }: { result: Result; onRegenerate: () => void }) {
  const c = result.content;
  const status =
    c.reviewStatus === "approved"
      ? { label: "Reviewed by NCPOR", cls: "bg-ok/10 text-ok" }
      : { label: "AI draft · awaiting review", cls: "bg-warn/10 text-warn" };
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-muted">
      <span className={`rounded px-1.5 py-0.5 font-semibold ${status.cls}`}>{status.label}</span>
      <span>
        {c.provider === "mock" ? PROVIDER_LABEL.mock : `${PROVIDER_LABEL[c.provider] ?? c.provider} (${c.model})`}
        {c.editedByReviewer ? " · edited by reviewer" : ""} ·{" "}
        {new Date(c.generatedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
        {result.cached ? " · saved copy" : ""}
      </span>
      {result.canRegenerate && (
        <button onClick={onRegenerate} className="ml-auto underline font-semibold text-ink-2">
          Regenerate
        </button>
      )}
    </div>
  );
}
