"use client";

import Link from "next/link";
import { useState } from "react";
import { REPORT_TYPE_LABEL, regionColor } from "@/lib/regions";
import { AIPanel } from "./AIPanel";

export interface ReaderReport {
  id: string;
  slug: string;
  title: string;
  type: string;
  authors: string;
  venue: string | null;
  publishedOn: string;
  abstract: string;
  project: string | null;
  expedition: { slug: string; shortName: string; name: string; region: string; hasStory: boolean };
  station: string;
  sections: { id: string; number: string; heading: string; body: string }[];
}

export function ReportReader({
  report,
  autoExplain,
  autoCaption,
}: {
  report: ReaderReport;
  autoExplain: "student" | "public" | null;
  autoCaption: boolean;
}) {
  const [cited, setCited] = useState<string[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const color = regionColor(report.expedition.region);

  function jumpTo(number: string) {
    const el = document.getElementById(`section-${number}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    setFlash(number);
    setTimeout(() => setFlash(null), 2200);
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 grid lg:grid-cols-[minmax(0,1fr)_420px] gap-10 items-start">
      <article>
        <nav className="text-xs text-muted mb-6 flex flex-wrap gap-1.5" aria-label="Breadcrumb">
          <Link href="/explore" className="hover:text-ink">Explore</Link> /
          <Link href={`/expeditions/${report.expedition.slug}`} className="hover:text-ink">{report.expedition.shortName}</Link> /
          <span>{REPORT_TYPE_LABEL[report.type] ?? report.type}</span>
        </nav>
        <p className="eyebrow" style={{ color }}>
          {REPORT_TYPE_LABEL[report.type] ?? report.type} · {report.expedition.shortName} · {report.station}
        </p>
        <h1 className="font-serif text-3xl md:text-[2.6rem] leading-[1.12] tracking-tight mt-3">{report.title}</h1>
        <dl className="mt-5 grid sm:grid-cols-3 gap-4 text-sm border-y border-line py-4">
          <div>
            <dt className="text-xs text-muted">Authors</dt>
            <dd>{report.authors}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Published</dt>
            <dd>{new Date(report.publishedOn).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Series</dt>
            <dd>{report.venue ?? "—"}</dd>
          </div>
        </dl>

        <section className="mt-8 rounded-xl bg-paper-2 p-5">
          <h2 className="eyebrow mb-2">Abstract</h2>
          <p className="leading-relaxed text-ink-2">{report.abstract}</p>
        </section>

        <p className="text-xs text-muted mt-6">
          Original text below. Sections cited by the AI summary are marked <span className="inline-block w-2 h-2 rounded-full align-middle" style={{ background: color }} />.
        </p>

        {report.sections.map((s) => {
          const isCited = cited.includes(s.number);
          return (
            <section
              key={s.id}
              id={`section-${s.number}`}
              className={`scroll-mt-24 mt-8 pl-5 border-l-2 transition-colors duration-500 ${
                flash === s.number ? "bg-accent/10" : ""
              }`}
              style={{ borderColor: isCited ? color : "transparent" }}
            >
              <h2 className="font-serif text-xl">
                <span className="text-muted mr-2">§{s.number}</span>
                {s.heading}
                {isCited && (
                  <span className="ml-2 align-middle text-[10px] font-sans font-bold uppercase tracking-wider rounded px-1.5 py-0.5 text-white" style={{ background: color }}>
                    cited
                  </span>
                )}
              </h2>
              <p className="mt-3 leading-[1.8] text-ink-2">{s.body}</p>
            </section>
          );
        })}

        {report.expedition.hasStory && (
          <Link href={`/expeditions/${report.expedition.slug}/story`} className="mt-12 card p-5 flex items-center justify-between hover:border-ink">
            <span>
              <span className="eyebrow block">Part of</span>
              <span className="font-serif text-lg">{report.expedition.name} — the story</span>
            </span>
            <span aria-hidden>→</span>
          </Link>
        )}
      </article>

      <AIPanel
        report={report}
        autoExplain={autoExplain}
        autoCaption={autoCaption}
        onCitations={setCited}
        onJump={jumpTo}
      />
    </div>
  );
}
