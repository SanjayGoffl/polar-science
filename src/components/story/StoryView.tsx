"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PolarMap, type MapFocus } from "@/components/map";
import { REPORT_TYPE_LABEL, regionColor, regionLabel, type RegionView } from "@/lib/regions";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { SourceNotice } from "@/components/Provenance";
import { Gallery } from "./Gallery";

export interface StoryData {
  slug: string;
  name: string;
  shortName: string;
  season: string;
  region: string;
  summary: string;
  heroImage: string;
  contentStatus: string;
  sourceUrl: string | null;
  station: { slug: string; name: string; location: string; lat: number; lng: number; region: string };
  chapters: {
    id: string;
    kind: string;
    eyebrow: string;
    title: string;
    body: string;
    image: string | null;
    focus: MapFocus | null;
    stats: { label: string; value: string }[];
  }[];
  projects: { id: string; title: string; topic: string; lead: string; summary: string }[];
  team: { id: string; name: string; role: string; institution: string; expertise: string }[];
  reports: { slug: string; title: string; type: string; authors: string; venue: string | null; publishedOn: string; abstract: string }[];
  media: { id: string; url: string; caption: string; altText: string; credit: string }[];
  data: { id: string; title: string; parameter: string; format: string; volume: string; npdcUrl: string }[];
  others: { slug: string; shortName: string; name: string; heroImage: string; summary: string }[];
}

const SCROLLY = ["why", "what", "where", "who", "found"];
const SHORT: Record<string, string> = {
  why: "Why", what: "What", where: "Where", who: "Who", found: "Findings", data: "Data", publications: "Papers", media: "Photos",
};

export function StoryView({ story }: { story: StoryData }) {
  const [active, setActive] = useState(0);
  const desktop = useMediaQuery("(min-width: 1024px)");
  const refs = useRef<(HTMLElement | null)[]>([]);
  const color = regionColor(story.region);
  const accent = { color };

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (en.isIntersecting) setActive(Number((en.target as HTMLElement).dataset.index));
        }
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  const scrollyChapters = story.chapters.filter((c) => SCROLLY.includes(c.kind));
  const tail = story.chapters.filter((c) => !SCROLLY.includes(c.kind));
  const current = story.chapters[active];
  const inScrolly = current && SCROLLY.includes(current.kind);
  const whereIdx = story.chapters.findIndex((c) => c.kind === "where");
  const mapPoint = [{ id: story.station.slug, name: story.station.name, region: story.station.region, lat: story.station.lat, lng: story.station.lng }];

  const register = (i: number) => (el: HTMLElement | null) => {
    refs.current[i] = el;
  };
  const idx = (id: string) => story.chapters.findIndex((c) => c.id === id);

  return (
    <article>
      {/* ---------- Cover ---------- */}
      <header className="relative isolate min-h-[88vh] flex items-end text-white overflow-hidden">
        <Image src={story.heroImage} alt="" fill priority className="object-cover -z-10" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#07121a] via-[#07121a]/40 to-transparent" />
        <div className="mx-auto max-w-6xl w-full px-5 pb-16">
          <p className="eyebrow !text-white/80">
            {regionLabel(story.region)} · {story.station.name} · {story.season}
          </p>
          <h1 className="font-serif text-5xl md:text-7xl leading-[1.02] tracking-tight max-w-4xl mt-3">{story.name}</h1>
          <p className="mt-5 max-w-2xl text-lg text-white/85">{story.summary}</p>
          <div className="mt-8 flex items-center gap-4 text-sm text-white/80">
            <a href="#chapter-0" className="btn btn-light">
              Begin · {story.chapters.length} chapters ↓
            </a>
            <span>≈ 6 min read</span>
          </div>
          <div className="mt-6 max-w-2xl">
            <SourceNotice status={story.contentStatus} sourceUrl={story.sourceUrl} what="story" tone="dark" />
          </div>
        </div>
      </header>

      {/* ---------- Chapter rail ---------- */}
      <nav aria-label="Chapters" className="sticky top-[92px] md:top-16 z-[900] bg-paper/90 backdrop-blur border-b border-line">
        <ol className="mx-auto max-w-6xl px-5 flex gap-1 overflow-x-auto scroll-x py-2">
          {story.chapters.map((c, i) => (
            <li key={c.id}>
              <a
                href={`#chapter-${i}`}
                aria-current={i === active ? "step" : undefined}
                className={`flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  i === active ? "bg-ink text-paper" : i < active ? "text-ink" : "text-muted hover:text-ink"
                }`}
              >
                <span
                  className="w-5 h-5 grid place-items-center rounded-full text-[10px]"
                  style={{ background: i === active ? color : i < active ? "#10202b22" : "transparent", border: i > active ? "1px solid #d9d6cc" : undefined, color: i === active ? "#fff" : undefined }}
                >
                  {i + 1}
                </span>
                {SHORT[c.kind] ?? c.kind}
              </a>
            </li>
          ))}
        </ol>
        <div className="h-0.5 bg-line">
          <div className="h-full transition-all duration-500" style={{ width: `${((active + 1) / story.chapters.length) * 100}%`, background: color }} />
        </div>
      </nav>

      {/* ---------- Scrollytelling: chapters 1–5 ---------- */}
      <div className="mx-auto max-w-6xl px-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-14">
        <div>
          {scrollyChapters.map((c) => {
            const i = idx(c.id);
            return (
              <section
                key={c.id}
                id={`chapter-${i}`}
                data-index={i}
                ref={register(i)}
                className="min-h-[85vh] py-20 flex flex-col justify-center scroll-mt-28"
              >
                <p className="eyebrow" style={accent}>
                  {c.eyebrow}
                </p>
                <h2 className="font-serif text-4xl md:text-[2.8rem] leading-[1.08] tracking-tight mt-3">{c.title}</h2>
                <p className="text-lg leading-relaxed text-ink-2 mt-5">{c.body}</p>

                {/* mobile visual */}
                <div className="lg:hidden mt-6 relative aspect-[16/10] rounded-xl overflow-hidden border border-line">
                  {c.kind === "where" ? (
                    !desktop && <PolarMap points={mapPoint} activeId={story.station.slug} view={story.region as RegionView} focus={c.focus} interactive={false} />
                  ) : (
                    <Image src={c.image ?? story.heroImage} alt="" fill className="object-cover" />
                  )}
                </div>

                {c.stats.length > 0 && (
                  <dl className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {c.stats.map((s) => (
                      <div key={s.label} className="border-t-2 pt-3" style={{ borderColor: color }}>
                        <dd className="font-serif text-3xl md:text-4xl">{s.value}</dd>
                        <dt className="text-xs text-muted mt-1 uppercase tracking-wider font-semibold">{s.label}</dt>
                      </div>
                    ))}
                  </dl>
                )}

                {c.kind === "what" && story.projects.length > 0 && (
                  <ul className="mt-8 grid sm:grid-cols-2 gap-3">
                    {story.projects.map((p, k) => (
                      <li key={p.id} className="card p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest" style={accent}>
                          Question {k + 1} · {p.topic}
                        </p>
                        <p className="font-semibold mt-1">{p.title}</p>
                        <p className="text-sm text-ink-2 mt-1">{p.summary}</p>
                        <p className="text-xs text-muted mt-2">Led by {p.lead}</p>
                      </li>
                    ))}
                  </ul>
                )}

                {c.kind === "where" && (
                  <Link href={`/stations/${story.station.slug}`} className="mt-6 text-sm font-semibold underline underline-offset-4">
                    {story.station.name} station · {story.station.location} →
                  </Link>
                )}

                {c.kind === "who" && story.team.length > 0 && (
                  <ul className="mt-8 grid sm:grid-cols-2 gap-3">
                    {story.team.map((m) => (
                      <li key={m.id} className="flex gap-3 items-start">
                        <span
                          className="w-11 h-11 shrink-0 rounded-full grid place-items-center text-white font-semibold text-sm"
                          style={{ background: color }}
                          aria-hidden
                        >
                          {m.name.replace(/^(Dr\.|Cdr\.)\s*/, "").split(" ").map((w) => w[0]).slice(0, 2).join("")}
                        </span>
                        <span>
                          <span className="block font-semibold text-sm">{m.name}</span>
                          <span className="block text-xs text-ink-2">{m.role}</span>
                          <span className="block text-xs text-muted">{m.institution}</span>
                        </span>
                      </li>
                    ))}
                    <li className="sm:col-span-2 text-xs text-muted">Team members shown are illustrative.</li>
                  </ul>
                )}
              </section>
            );
          })}
        </div>

        {/* sticky visual */}
        <div className="hidden lg:block">
          <div className="sticky top-32 h-[calc(100vh-10rem)] my-10 rounded-2xl overflow-hidden border border-line bg-ice">
            {scrollyChapters.map((c) => {
              const i = idx(c.id);
              if (c.kind === "where") return null;
              return (
                <div key={c.id} className="absolute inset-0 transition-opacity duration-700" style={{ opacity: i === active ? 1 : 0 }} aria-hidden={i !== active}>
                  <Image src={c.image ?? story.heroImage} alt="" fill className="object-cover" />
                </div>
              );
            })}
            <div
              className="absolute inset-0 transition-opacity duration-700"
              style={{ opacity: current?.kind === "where" ? 1 : 0, pointerEvents: current?.kind === "where" ? "auto" : "none" }}
            >
              {desktop && active >= whereIdx - 1 && (
                <PolarMap
                  points={mapPoint}
                  activeId={story.station.slug}
                  view={story.region as RegionView}
                  focus={current?.kind === "where" ? current.focus : null}
                />
              )}
            </div>
            {inScrolly && current && (
              <p key={current.id} className="fade-in absolute left-4 bottom-4 z-[500] rounded-lg bg-white/90 px-3 py-1.5 text-xs font-semibold shadow">
                {current.eyebrow}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ---------- Chapters 6–8 ---------- */}
      {tail.map((c) => {
        const i = idx(c.id);
        return (
          <section
            key={c.id}
            id={`chapter-${i}`}
            data-index={i}
            ref={register(i)}
            className={`scroll-mt-28 py-20 ${c.kind === "data" ? "bg-ink text-paper" : ""}`}
          >
            <div className="mx-auto max-w-6xl px-5">
              <p className={`eyebrow ${c.kind === "data" ? "!text-paper/60" : ""}`} style={c.kind === "data" ? undefined : accent}>
                {c.eyebrow}
              </p>
              <h2 className="font-serif text-4xl md:text-5xl tracking-tight mt-3 max-w-3xl">{c.title}</h2>
              <p className={`text-lg mt-4 max-w-2xl ${c.kind === "data" ? "text-paper/75" : "text-ink-2"}`}>{c.body}</p>

              {c.kind === "data" && (
                <>
                  <ul className="mt-10 grid md:grid-cols-2 gap-4">
                    {story.data.map((d) => (
                      <li key={d.id} className="rounded-xl border border-white/15 bg-white/5 p-5 flex flex-col">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-paper/55">{d.format}</p>
                        <p className="font-semibold text-lg mt-1">{d.title}</p>
                        <p className="text-sm text-paper/70 mt-1">{d.parameter}</p>
                        <p className="text-sm mt-3 font-serif">{d.volume}</p>
                        <a href={d.npdcUrl} target="_blank" rel="noreferrer" className="mt-4 text-sm font-semibold underline underline-offset-4 self-start">
                          Find on NPDC ↗
                        </a>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-paper/50 mt-6 max-w-2xl">
                    Dataset records are held by the National Polar Data Center (npdc.ncaor.gov.in). This portal links to NPDC and doesn&apos;t duplicate its search.
                    Dataset names here are illustrative.
                  </p>
                </>
              )}

              {c.kind === "publications" && (
                <ul className="mt-10 grid md:grid-cols-2 gap-5">
                  {story.reports.map((r) => (
                    <li key={r.slug} className="card p-6 flex flex-col">
                      <p className="eyebrow" style={accent}>
                        {REPORT_TYPE_LABEL[r.type] ?? r.type} · {new Date(r.publishedOn).getFullYear()}
                      </p>
                      <h3 className="font-serif text-xl leading-snug mt-2">{r.title}</h3>
                      <p className="text-xs text-muted mt-2">{r.authors}</p>
                      <p className="text-sm text-ink-2 mt-3 line-clamp-3">{r.abstract}</p>
                      <div className="mt-auto pt-5 flex flex-wrap gap-2">
                        <Link href={`/reports/${r.slug}?explain=student`} className="btn btn-accent !py-2 !px-4 !text-sm">
                          ✦ Explain this simply
                        </Link>
                        <Link href={`/reports/${r.slug}`} className="btn btn-ghost !py-2 !px-4 !text-sm">
                          Read original
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

      {/* ---------- Continue ---------- */}
      <section className="mx-auto max-w-6xl px-5 pt-10">
        <div className="card p-8 grid md:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <p className="eyebrow">The end of this story, but not the science</p>
            <p className="font-serif text-2xl mt-2">Keep exploring India&apos;s polar research.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {story.others.map((o) => (
              <Link key={o.slug} href={`/expeditions/${o.slug}/story`} className="btn btn-primary">
                Next story: {o.shortName} →
              </Link>
            ))}
            <Link href={`/explore?station=${story.station.slug}`} className="btn btn-ghost">
              Back to the map
            </Link>
          </div>
        </div>
      </section>
    </article>
  );
}
