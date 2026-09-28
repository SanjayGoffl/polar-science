"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PolarMap, type MapFocus } from "@/components/map";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { REPORT_TYPE_LABEL, regionColor, regionLabel, type RegionView } from "@/lib/regions";
import { Gallery, type GalleryItem } from "./Gallery";

export interface Citation {
  reportSlug: string;
  section: string;
  title: string;
  publisher: string;
  publishedOn: string;
  url: string;
}

export interface StoryImage {
  url: string;
  alt: string;
  credit: string;
}

export interface StoryData {
  slug: string;
  name: string;
  shortName: string;
  season: string | null;
  region: string;
  summary: string;
  sourceUrl: string;
  hero: StoryImage | null;
  station: { slug: string; name: string; location: string; lat: number; lng: number; region: string } | null;
  chapters: {
    id: string;
    kind: string;
    title: string;
    body: string;
    citation: Citation | null;
    focus: MapFocus | null;
    image: StoryImage | null;
  }[];
  reports: { slug: string; title: string; type: string; publisher: string; publishedOn: string; abstract: string; externalUrl: string }[];
  media: GalleryItem[];
  resources: { id: string; title: string; url: string; kind: string; description: string; publisher: string }[];
  others: { slug: string; shortName: string }[];
}

const SCROLLY = ["why", "what", "where", "who", "found"];
const SHORT: Record<string, string> = {
  why: "Why", what: "What", where: "Where", who: "Who", found: "Results", data: "Data", publications: "Sources", media: "Media",
};
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

function Cite({ c }: { c: Citation }) {
  return (
    <p className="mt-4 text-xs text-muted">
      Source:{" "}
      <Link href={`/reports/${c.reportSlug}#section-${c.section}`} className="underline underline-offset-2 hover:text-ink">
        {c.title}, §{c.section}
      </Link>{" "}
      · {c.publisher.split(" · ").pop()} · {fmtDate(c.publishedOn)} ·{" "}
      <a href={c.url} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-ink">
        original ↗
      </a>
    </p>
  );
}

function Backdrop({ image, region }: { image: StoryImage | null; region: string }) {
  if (image) return <Image src={image.url} alt={image.alt} fill className="object-cover" sizes="(min-width:1024px) 50vw, 100vw" />;
  return (
    <div
      className="absolute inset-0"
      style={{ background: `radial-gradient(120% 90% at 20% 10%, #ffffff55, transparent), linear-gradient(160deg, ${regionColor(region)}, #07121a)` }}
      aria-hidden
    />
  );
}

export function StoryView({ story }: { story: StoryData }) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);
  const desktop = useMediaQuery("(min-width: 1024px)");
  const color = regionColor(story.region);
  const accent = { color };

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) if (en.isIntersecting) setActive(Number((en.target as HTMLElement).dataset.index));
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  const scrolly = story.chapters.filter((c) => SCROLLY.includes(c.kind));
  const tail = story.chapters.filter((c) => !SCROLLY.includes(c.kind));
  const current = story.chapters[active];
  const idx = (id: string) => story.chapters.findIndex((c) => c.id === id);
  const register = (i: number) => (el: HTMLElement | null) => {
    refs.current[i] = el;
  };
  const mapPoints = story.station ? [{ id: story.station.slug, name: story.station.name, region: story.station.region, lat: story.station.lat, lng: story.station.lng }] : [];
  const firstMapIdx = story.chapters.findIndex((c) => c.kind === "where");

  return (
    <article>
      {/* Print-only masthead: the cover below is decorative and hidden from the handout. */}
      <div className="hidden print:block px-5 pt-4">
        <p className="text-xs text-muted">
          {regionLabel(story.region)}
          {story.station ? ` · ${story.station.name}` : ""}
          {story.season ? ` · ${story.season}` : ""}
        </p>
        <h1 className="font-serif text-3xl tracking-tight mt-1">{story.name}</h1>
        <p className="mt-2 text-ink-2">{story.summary}</p>
        <p className="mt-1 text-xs text-muted">
          Source: <a href={story.sourceUrl}>{story.sourceUrl}</a>
        </p>
      </div>

      {/* Cover */}
      <header className="no-print relative isolate min-h-[80vh] flex items-end text-white overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <Backdrop image={story.hero} region={story.region} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#07121a] via-[#07121a]/50 to-transparent" />
        </div>
        <div className="mx-auto max-w-6xl w-full px-5 pb-14">
          <p className="eyebrow !text-white/80">
            {regionLabel(story.region)}
            {story.station ? ` · ${story.station.name}` : ""}
            {story.season ? ` · ${story.season}` : ""}
          </p>
          <h1 className="font-serif text-4xl md:text-6xl leading-[1.05] tracking-tight max-w-4xl mt-3">{story.name}</h1>
          <p className="mt-5 max-w-2xl text-lg text-white/85">{story.summary}</p>
          <div className="mt-8 flex flex-wrap items-center gap-4 text-sm text-white/80">
            <a href="#chapter-0" className="btn btn-light">
              Begin · {story.chapters.length} chapters ↓
            </a>
            <span>Every chapter quotes an official source ({story.reports.length} documents)</span>
          </div>
          {story.hero && <p className="mt-6 text-[11px] text-white/60">Photo: {story.hero.credit}</p>}
        </div>
      </header>

      {/* Chapter rail */}
      <nav aria-label="Chapters" className="no-print sticky top-[92px] md:top-16 z-[900] bg-paper/90 backdrop-blur border-b border-line">
        <ol className="mx-auto max-w-6xl px-5 flex gap-1 overflow-x-auto scroll-x py-2">
          {story.chapters.map((c, i) => (
            <li key={c.id}>
              <a
                href={`#chapter-${i}`}
                aria-current={i === active ? "step" : undefined}
                aria-label={`${i + 1} ${SHORT[c.kind] ?? c.kind}: ${c.title}`}
                title={c.title}
                className={`flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  i === active ? "bg-ink text-paper" : i < active ? "text-ink" : "text-muted hover:text-ink"
                }`}
              >
                <span
                  className="w-5 h-5 grid place-items-center rounded-full text-[10px]"
                  style={{
                    background: i === active ? color : i < active ? "#10202b22" : "transparent",
                    border: i > active ? "1px solid #d9d6cc" : undefined,
                    color: i === active ? "#fff" : undefined,
                  }}
                >
                  {i + 1}
                </span>
                {SHORT[c.kind] ?? c.kind}
              </a>
            </li>
          ))}
        </ol>
        <div className="h-0.5 bg-line">
          <div className="h-full transition-all duration-500" style={{ width: `${((active + 1) / Math.max(1, story.chapters.length)) * 100}%`, background: color }} />
        </div>
      </nav>

      {/* Scrollytelling chapters */}
      <div className="mx-auto max-w-6xl px-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-14">
        <div>
          {scrolly.map((c) => {
            const i = idx(c.id);
            return (
              <section key={c.id} id={`chapter-${i}`} data-index={i} ref={register(i)} className="min-h-[80vh] py-20 flex flex-col justify-center scroll-mt-28">
                <p className="eyebrow" style={accent}>
                  Chapter {i + 1} · {SHORT[c.kind] ?? c.kind}
                </p>
                <h2 className="font-serif text-3xl md:text-[2.5rem] leading-[1.1] tracking-tight mt-3">{c.title}</h2>
                <blockquote className="mt-5 border-l-2 pl-5 text-lg leading-relaxed text-ink-2 whitespace-pre-line" style={{ borderColor: color }}>
                  {c.body}
                </blockquote>
                {c.citation && <Cite c={c.citation} />}

                {!desktop && (
                  <div className="mt-6 relative aspect-[16/10] rounded-xl overflow-hidden border border-line bg-ice">
                    {c.kind === "where" && mapPoints.length ? (
                      <PolarMap points={mapPoints} activeId={story.station!.slug} view={story.region as RegionView} focus={c.focus} interactive={false} />
                    ) : (
                      <Backdrop image={c.image ?? story.hero} region={story.region} />
                    )}
                  </div>
                )}
                {c.kind === "where" && story.station && (
                  <Link href={`/stations/${story.station.slug}`} className="mt-6 text-sm font-semibold underline underline-offset-4">
                    {story.station.name} · {story.station.location} →
                  </Link>
                )}
              </section>
            );
          })}
        </div>

        {/* Sticky visual */}
        {desktop && (
          <div className="no-print">
            <div className="sticky top-32 h-[calc(100vh-10rem)] my-10 rounded-2xl overflow-hidden border border-line bg-ice">
              {scrolly.map((c) => {
                const i = idx(c.id);
                if (c.kind === "where" && mapPoints.length) return null;
                const img = c.image ?? story.hero;
                return (
                  <div key={c.id} className="absolute inset-0 transition-opacity duration-700" style={{ opacity: i === active ? 1 : 0 }} aria-hidden={i !== active}>
                    <Backdrop image={img} region={story.region} />
                    {img && <p className="absolute right-3 bottom-3 z-10 rounded bg-black/55 px-2 py-1 text-[10px] text-white/85">{img.credit}</p>}
                  </div>
                );
              })}
              {mapPoints.length > 0 && firstMapIdx >= 0 && (
                <div
                  className="absolute inset-0 transition-opacity duration-700"
                  style={{ opacity: current?.kind === "where" ? 1 : 0, pointerEvents: current?.kind === "where" ? "auto" : "none" }}
                >
                  {active >= firstMapIdx - 1 && (
                    <PolarMap points={mapPoints} activeId={story.station!.slug} view={story.region as RegionView} focus={current?.kind === "where" ? current.focus : null} />
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Data, sources and media */}
      {tail.map((c) => {
        const i = idx(c.id);
        const dark = c.kind === "data";
        return (
          <section key={c.id} id={`chapter-${i}`} data-index={i} ref={register(i)} className={`scroll-mt-28 py-20 ${dark ? "bg-ink text-paper" : ""}`}>
            <div className="mx-auto max-w-6xl px-5">
              <p className={`eyebrow ${dark ? "!text-paper/60" : ""}`} style={dark ? undefined : accent}>
                Chapter {i + 1} · {SHORT[c.kind] ?? c.kind}
              </p>
              <h2 className="font-serif text-4xl md:text-5xl tracking-tight mt-3 max-w-3xl">{c.title}</h2>
              {c.body && (
                <blockquote
                  className={`text-lg mt-4 max-w-3xl border-l-2 pl-5 whitespace-pre-line ${dark ? "text-paper/80 border-paper/30" : "text-ink-2"}`}
                  style={dark ? undefined : { borderColor: color }}
                >
                  {c.body}
                </blockquote>
              )}
              {c.citation && <Cite c={c.citation} />}

              {c.kind === "data" && (
                <ul className="mt-10 grid md:grid-cols-2 gap-4">
                  {story.resources.map((r) => (
                    <li key={r.id} className="rounded-xl border border-white/15 bg-white/5 p-5 flex flex-col">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-paper/55">
                        {r.kind.replaceAll("-", " ")} · {r.publisher}
                      </p>
                      <p className="font-semibold text-lg mt-1">{r.title}</p>
                      <p className="text-sm text-paper/70 mt-1">{r.description}</p>
                      <a href={r.url} target="_blank" rel="noreferrer" className="mt-4 text-sm font-semibold underline underline-offset-4 self-start">
                        Open ↗
                      </a>
                    </li>
                  ))}
                </ul>
              )}

              {c.kind === "publications" && (
                <ul className="mt-10 grid md:grid-cols-2 gap-5">
                  {story.reports.map((r) => (
                    <li key={r.slug} className="card p-6 flex flex-col">
                      <p className="eyebrow" style={accent}>
                        {REPORT_TYPE_LABEL[r.type] ?? r.type} · {fmtDate(r.publishedOn)}
                      </p>
                      <h3 className="font-serif text-xl leading-snug mt-2">{r.title}</h3>
                      <p className="text-xs text-muted mt-2">{r.publisher}</p>
                      <p className="text-sm text-ink-2 mt-3 line-clamp-3">{r.abstract}</p>
                      <div className="mt-auto pt-5 flex flex-wrap gap-2">
                        <Link href={`/reports/${r.slug}?explain=student`} className="btn btn-accent !py-2 !px-4 !text-sm">
                          Plain-language summary
                        </Link>
                        <Link href={`/reports/${r.slug}`} className="btn btn-ghost !py-2 !px-4 !text-sm">
                          Read the full text
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {c.kind === "media" && <Gallery items={story.media} />}
            </div>
          </section>
        );
      })}

      {/* Continue */}
      <section className="no-print mx-auto max-w-6xl px-5 pt-10">
        <div className="card p-8 grid md:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <p className="eyebrow">Keep exploring</p>
            <p className="font-serif text-2xl mt-2">More of India&apos;s polar and Himalayan research</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {story.others.map((o) => (
              <Link key={o.slug} href={`/expeditions/${o.slug}/story`} className="btn btn-primary">
                Next story: {o.shortName} →
              </Link>
            ))}
            <Link href={story.station ? `/explore?station=${story.station.slug}` : "/explore"} className="btn btn-ghost">
              Back to the map
            </Link>
          </div>
        </div>
      </section>

      <PrintButton />
    </article>
  );
}

function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print btn btn-ghost fixed bottom-5 right-5 z-[900] shadow-lg bg-paper"
      aria-label="Print this story or save it as a PDF, with citations"
    >
      🖨️ Print / save as PDF
    </button>
  );
}
