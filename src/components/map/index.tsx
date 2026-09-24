"use client";

import dynamic from "next/dynamic";

// Leaflet touches `window` at import time, so the map only ever renders client-side.
export const PolarMap = dynamic(() => import("./PolarMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-ice animate-pulse" aria-label="Loading map" />,
});

export type { MapFocus, MapPoint } from "./PolarMap";
