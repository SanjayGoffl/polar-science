"use client";

import { useEffect, useRef } from "react";
import { regionColor, regionLabel } from "@/lib/regions";

export interface TimelineItem {
  id: string;
  shortName: string;
  year: number;
  region: string;
  stationName: string;
  hasStory: boolean;
}

interface Props {
  items: TimelineItem[];
  activeId?: string | null;
  highlightIds?: string[];
  onSelect: (id: string) => void;
}

export function ExpeditionTimeline({ items, activeId, highlightIds = [], onSelect }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const sorted = [...items].sort((a, b) => a.year - b.year);
  const minYear = sorted[0]?.year ?? 1980;
  const maxYear = sorted[sorted.length - 1]?.year ?? 2026;

  useEffect(() => {
    if (!activeId) return;
    const el = scroller.current?.querySelector<HTMLElement>(`[data-id="${activeId}"]`);
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeId]);

  return (
    <div className="relative">
      <p className="sr-only">
        {items.length} expeditions from {minYear} to {maxYear}
      </p>
      <div ref={scroller} className="scroll-x overflow-x-auto pb-3" role="listbox" aria-label="Expedition timeline">
        <ol className="relative flex gap-3 min-w-max px-1 pt-8">
          <li className="absolute left-0 right-0 top-[18px] h-px bg-line list-none" aria-hidden />
          {sorted.map((it, i) => {
            const active = it.id === activeId;
            const dim = highlightIds.length > 0 && !highlightIds.includes(it.id) && !active;
            const newDecade = i === 0 || Math.floor(sorted[i - 1].year / 10) !== Math.floor(it.year / 10);
            const color = regionColor(it.region);
            return (
              <li key={it.id} data-id={it.id} className="relative">
                {newDecade && (
                  <span className="absolute -top-8 left-0 text-[11px] font-semibold text-muted tracking-widest">
                    {Math.floor(it.year / 10) * 10}s
                  </span>
                )}
                <span
                  className="absolute top-[-15px] left-5 w-3 h-3 rounded-full border-2 border-paper transition-transform"
                  style={{ background: color, transform: active ? "scale(1.5)" : undefined }}
                  aria-hidden
                />
                <button
                  role="option"
                  aria-selected={active}
                  onClick={() => onSelect(it.id)}
                  className={`w-48 text-left rounded-xl border p-3 transition-all ${
                    active ? "bg-ink text-paper border-ink shadow-lg -translate-y-1" : "bg-white border-line hover:border-ink"
                  } ${dim ? "opacity-45" : ""}`}
                >
                  <span className="flex items-baseline justify-between">
                    <span className="font-serif text-2xl">{it.year}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: active ? "#fff" : color }}>
                      {regionLabel(it.region)}
                    </span>
                  </span>
                  <span className="block font-semibold text-sm mt-1">{it.shortName}</span>
                  <span className={`block text-xs ${active ? "text-paper/70" : "text-muted"}`}>{it.stationName}</span>
                  {it.hasStory && (
                    <span className={`mt-2 inline-block text-[10px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 ${active ? "bg-accent text-white" : "bg-accent/10 text-accent"}`}>
                      ★ Story
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
