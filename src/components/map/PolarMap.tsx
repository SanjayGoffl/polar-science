"use client";

import L from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { REGION_BOUNDS, regionColor, type RegionView } from "@/lib/regions";

export interface MapPoint {
  id: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
  kind?: string;
}

export interface MapFocus {
  lat: number;
  lng: number;
  zoom: number;
}

interface Props {
  points: MapPoint[];
  activeId?: string | null;
  onSelect?: (id: string) => void;
  view?: RegionView;
  focus?: MapFocus | null;
  showLabels?: boolean;
  interactive?: boolean;
  className?: string;
}

function pinIcon(p: MapPoint, active: boolean, showLabel: boolean) {
  const color = regionColor(p.region);
  const dot = p.kind === "historic" ? `background:#fff;border-color:${color}` : `background:${color}`;
  return L.divIcon({
    className: "",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    html: `<div class="pin ${active ? "active" : ""}" style="color:${color}">
      <div class="pin-ring"></div><div class="pin-dot" style="${dot}"></div>
      ${showLabel || active ? `<div class="pin-label">${p.name}</div>` : ""}
    </div>`,
  });
}

function Camera({ view, focus }: { view: RegionView; focus?: MapFocus | null }) {
  const map = useMap();
  const lat = focus?.lat;
  const lng = focus?.lng;
  const zoom = focus?.zoom;

  useEffect(() => {
    const move = (animate: boolean) => {
      const size = map.getSize();
      // Hidden containers (e.g. a mobile-only map on desktop) have no size; Leaflet would compute NaN.
      if (!size.x || !size.y) return;
      const reduce = !animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (lat != null && lng != null) map.flyTo([lat, lng], zoom ?? 6, { duration: reduce ? 0 : 1.4, animate: !reduce });
      else map.flyToBounds(REGION_BOUNDS[view], { duration: reduce ? 0 : 1.2, padding: [30, 30], animate: !reduce });
    };

    // Leaflet measures its container the instant it mounts, which can race the browser's own
    // layout pass (webfonts, CSS still applying) and freeze in with a 0-size or stale viewport,
    // so no tiles ever get requested until something else forces a reflow. A couple of
    // invalidateSize() calls on the next frames (cheap no-ops once sized correctly) close that race.
    const raf1 = requestAnimationFrame(() => {
      map.invalidateSize();
      const raf2 = requestAnimationFrame(() => {
        map.invalidateSize();
        move(true);
      });
      cleanupRaf2 = () => cancelAnimationFrame(raf2);
    });
    let cleanupRaf2: (() => void) | undefined;

    // When the container is revealed or resized, re-measure and re-frame.
    let wasEmpty = !map.getSize().x;
    const ro = new ResizeObserver(() => {
      map.invalidateSize();
      const empty = !map.getSize().x;
      if (wasEmpty && !empty) move(false);
      wasEmpty = empty;
    });
    ro.observe(map.getContainer());
    return () => {
      cancelAnimationFrame(raf1);
      cleanupRaf2?.();
      ro.disconnect();
    };
  }, [map, view, lat, lng, zoom]);
  return null;
}

export default function PolarMap({
  points,
  activeId,
  onSelect,
  view = "all",
  focus,
  showLabels = true,
  interactive = true,
  className = "h-full w-full",
}: Props) {
  const markers = useMemo(
    () => points.map((p) => ({ p, icon: pinIcon(p, p.id === activeId, showLabels) })),
    [points, activeId, showLabels],
  );

  return (
    <MapContainer
      bounds={REGION_BOUNDS[view]}
      className={className}
      scrollWheelZoom={false}
      zoomControl={interactive}
      dragging={interactive}
      doubleClickZoom={interactive}
      attributionControl
      worldCopyJump
      minZoom={2}
    >
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
        attribution="Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors"
        maxZoom={16}
      />
      <Camera view={view} focus={focus} />
      {markers.map(({ p, icon }) => (
        <Marker
          key={p.id}
          position={[p.lat, p.lng]}
          icon={icon}
          title={p.name}
          alt={p.name}
          keyboard
          zIndexOffset={p.id === activeId ? 1000 : 0}
          eventHandlers={{ click: () => onSelect?.(p.id) }}
        />
      ))}
    </MapContainer>
  );
}
