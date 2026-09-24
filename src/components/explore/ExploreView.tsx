"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { PolarMap } from "@/components/map";
import { ExpeditionTimeline } from "@/components/timeline/ExpeditionTimeline";
import { REGIONS, regionColor, regionLabel, type Region, type RegionView } from "@/lib/regions";

export interface ExploreStation {
  id: string;
  slug: string;
  name: string;
  region: string;
  kind: string;
  lat: number;
  lng: number;
  location: string;
  description: string;
  heroImage: string;
  established: number | null;
}

export interface ExploreExpedition {
  id: string;
  slug: string;
  shortName: string;
  name: string;
  year: number;
  season: string;
  region: string;
  stationId: string;
  summary: string;
  heroImage: string;
  hasStory: boolean;
  reportCount: number;
}

type Selection = { type: "station" | "expedition"; id: string } | null;

interface Props {
  stations: ExploreStation[];
  expeditions: ExploreExpedition[];
  initialRegion: RegionView;
  initialSelection: Selection;
}

export function ExploreView({ stations, expeditions, initialRegion, initialSelection }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [region, setRegion] = useState<RegionView>(initialRegion);
  const [sel, setSel] = useState<Selection>(initialSelection);

  const stationById = useMemo(() => new Map(stations.map((s) => [s.id, s])), [stations]);
  const visibleStations = stations.filter((s) => region === "all" || s.region === region);
  const visibleExpeditions = expeditions.filter((e) => region === "all" || e.region === region);

  const selStation = sel?.type === "station" ? stationById.get(sel.id) : undefined;
  const selExpedition = sel?.type === "expedition" ? expeditions.find((e) => e.id === sel.id) : undefined;
  const activeStationId = selStation?.id ?? selExpedition?.stationId ?? null;
  const focusStation = activeStationId ? stationById.get(activeStationId) : undefined;

  function syncUrl(r: RegionView, s: Selection) {
    const params = new URLSearchParams();
    if (r !== "all") params.set("region", r);
    if (s?.type === "station") params.set("station", stationById.get(s.id)!.slug);
    if (s?.type === "expedition") params.set("expedition", expeditions.find((e) => e.id === s.id)!.slug);
    router.replace(`${pathname}${params.size ? `?${params}` : ""}`, { scroll: false });
  }

  function select(s: Selection) {
    setSel(s);
    syncUrl(region, s);
  }

  function changeRegion(r: RegionView) {
    setRegion(r);
    setSel(null);
    syncUrl(r, null);
  }

  const stationExpeditions = selStation ? expeditions.filter((e) => e.stationId === selStation.id) : [];

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <p className="eyebrow">Explore</p>
          <h1 className="font-serif text-4xl md:text-5xl tracking-tight">Where India does polar science</h1>
          <p className="text-ink-2 mt-2 max-w-2xl">
            Click a station on the map or a year on the timeline. Each one opens the expedition, its reports, and (where available) the full story.
          </p>
        </div>
        <div role="tablist" aria-label="Region" className="flex gap-1 rounded-full bg-paper-2 p-1">
          {(["all", "antarctica", "arctic", "himalaya"] as RegionView[]).map((r) => (
            <button
              key={r}
              role="tab"
              aria-selected={region === r}
              onClick={() => changeRegion(r)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
                region === r ? "bg-white shadow text-ink" : "text-ink-2 hover:text-ink"
              }`}
            >
              {r === "all" ? "All regions" : REGIONS[r as Region].label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-5">
        <div className="relative h-[440px] md:h-[560px] rounded-2xl overflow-hidden border border-line">
          <PolarMap
            points={visibleStations}
            activeId={activeStationId}
            onSelect={(id) => select({ type: "station", id })}
            view={region}
            focus={focusStation ? { lat: focusStation.lat, lng: focusStation.lng, zoom: focusStation.region === "himalaya" ? 10 : 5 } : null}
          />
          <div className="absolute left-3 bottom-3 z-[500] flex gap-3 rounded-lg bg-white/90 px-3 py-2 text-xs shadow">
            {(Object.keys(REGIONS) as Region[]).map((r) => (
              <span key={r} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: REGIONS[r].color }} />
                {REGIONS[r].label}
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full border-2 border-antarctica bg-white" /> Historic
            </span>
          </div>
        </div>

        <aside className="card overflow-hidden flex flex-col min-h-[300px]" aria-live="polite">
          {!sel && <IntroPanel stations={visibleStations} onPick={(id) => select({ type: "station", id })} />}
          {selStation && (
            <div key={selStation.id} className="fade-in flex flex-col h-full">
              <div className="relative h-40">
                <Image src={selStation.heroImage} alt="" fill className="object-cover" />
                <span
                  className="absolute left-3 top-3 text-[10px] font-bold uppercase tracking-wider text-white rounded px-2 py-1"
                  style={{ background: regionColor(selStation.region) }}
                >
                  {regionLabel(selStation.region)} · {selStation.kind === "field-site" ? "Field site" : selStation.kind === "historic" ? "Historic base" : "Station"}
                </span>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <h2 className="font-serif text-2xl">{selStation.name}</h2>
                <p className="text-xs text-muted mb-3">
                  {selStation.location}
                  {selStation.established ? ` · since ${selStation.established}` : ""}
                </p>
                <p className="text-sm text-ink-2 leading-relaxed">{selStation.description}</p>
                <p className="eyebrow mt-5 mb-2">Expeditions here</p>
                <ul className="space-y-1.5">
                  {stationExpeditions.map((e) => (
                    <li key={e.id}>
                      <button onClick={() => select({ type: "expedition", id: e.id })} className="w-full text-left flex justify-between items-center rounded-lg px-3 py-2 bg-paper hover:bg-paper-2 text-sm">
                        <span>
                          <strong>{e.shortName}</strong> <span className="text-muted">· {e.year}</span>
                        </span>
                        {e.hasStory && <span className="text-[10px] font-bold uppercase text-accent">★ Story</span>}
                      </button>
                    </li>
                  ))}
                </ul>
                <Link href={`/stations/${selStation.slug}`} className="mt-auto pt-5 text-sm font-semibold underline underline-offset-4">
                  Station page & field notes →
                </Link>
              </div>
            </div>
          )}
          {selExpedition && (
            <div key={selExpedition.id} className="fade-in flex flex-col h-full">
              <div className="relative h-40">
                <Image src={selExpedition.heroImage} alt="" fill className="object-cover" />
                <span className="absolute left-3 top-3 text-[10px] font-bold uppercase tracking-wider text-white rounded px-2 py-1" style={{ background: regionColor(selExpedition.region) }}>
                  {selExpedition.season}
                </span>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <p className="eyebrow">{stationById.get(selExpedition.stationId)?.name}</p>
                <h2 className="font-serif text-2xl leading-tight">{selExpedition.name}</h2>
                <p className="text-sm text-ink-2 leading-relaxed mt-3">{selExpedition.summary}</p>
                <p className="text-xs text-muted mt-3">
                  {selExpedition.reportCount} report{selExpedition.reportCount === 1 ? "" : "s"} & publications
                </p>
                <div className="mt-auto pt-5 flex flex-wrap gap-2">
                  {selExpedition.hasStory && (
                    <Link href={`/expeditions/${selExpedition.slug}/story`} className="btn btn-accent">
                      Read the story →
                    </Link>
                  )}
                  <Link href={`/expeditions/${selExpedition.slug}`} className="btn btn-ghost">
                    Expedition details
                  </Link>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>

      <section className="mt-10" aria-labelledby="tl-h">
        <div className="flex items-baseline justify-between mb-2">
          <h2 id="tl-h" className="font-serif text-2xl">Expedition timeline</h2>
          <p className="text-xs text-muted">Scroll sideways · {visibleExpeditions.length} expeditions</p>
        </div>
        <ExpeditionTimeline
          items={visibleExpeditions.map((e) => ({
            id: e.id,
            shortName: e.shortName,
            year: e.year,
            region: e.region,
            stationName: stationById.get(e.stationId)?.name ?? "",
            hasStory: e.hasStory,
          }))}
          activeId={selExpedition?.id}
          highlightIds={stationExpeditions.map((e) => e.id)}
          onSelect={(id) => select({ type: "expedition", id })}
        />
      </section>
    </div>
  );
}

function IntroPanel({ stations, onPick }: { stations: ExploreStation[]; onPick: (id: string) => void }) {
  return (
    <div className="p-6 flex flex-col h-full">
      <p className="eyebrow mb-2">Start here</p>
      <h2 className="font-serif text-2xl leading-snug">Pick a place on the map, or a year on the timeline.</h2>
      <p className="text-sm text-ink-2 mt-3">India has run research stations at both poles and in the high Himalaya since 1983.</p>
      <ul className="mt-5 space-y-1.5">
        {stations.map((s) => (
          <li key={s.id}>
            <button onClick={() => onPick(s.id)} className="w-full flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-paper text-left text-sm">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: regionColor(s.region) }} />
              <span className="font-semibold">{s.name}</span>
              <span className="text-muted text-xs ml-auto">{regionLabel(s.region)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
