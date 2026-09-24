export type Region = "antarctica" | "arctic" | "himalaya";
export type RegionView = Region | "all";

export const REGIONS: Record<Region, { label: string; color: string; blurb: string; image: string }> = {
  antarctica: {
    label: "Antarctica",
    color: "#2c5d7c",
    blurb: "Four decades of Indian expeditions, from Dakshin Gangotri to Bharati and Maitri.",
    image: "/images/art/bharati.svg",
  },
  arctic: {
    label: "Arctic",
    color: "#6d4a86",
    blurb: "Himadri station in Svalbard, watching a fjord where the Arctic is warming fastest.",
    image: "/images/art/himadri.svg",
  },
  himalaya: {
    label: "Himalaya",
    color: "#a65a2e",
    blurb: "The ‘Third Pole’: glaciers of the Chandra basin that feed India’s rivers.",
    image: "/images/art/himansh.svg",
  },
};

/** Map framing per region: [[south, west], [north, east]] */
export const REGION_BOUNDS: Record<RegionView, [[number, number], [number, number]]> = {
  all: [[-72, -20], [80, 110]],
  antarctica: [[-73.5, 0], [-65.5, 86]],
  arctic: [[77.5, 4], [80.3, 22]],
  himalaya: [[32.2, 77.3], [32.55, 77.8]],
};

export const regionColor = (r: string) => REGIONS[r as Region]?.color ?? "#10202b";
export const regionLabel = (r: string) => REGIONS[r as Region]?.label ?? r;

export const REPORT_TYPE_LABEL: Record<string, string> = {
  "expedition-report": "Expedition report",
  publication: "Publication",
  "technical-note": "Technical note",
};
