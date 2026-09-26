export type Region = "antarctica" | "arctic" | "himalaya";
export type RegionView = Region | "all";

export const REGIONS: Record<Region, { label: string; color: string }> = {
  antarctica: {
    label: "Antarctica",
    color: "#2c5d7c",
  },
  arctic: {
    label: "Arctic",
    color: "#6d4a86",
  },
  himalaya: {
    label: "Himalaya",
    color: "#a65a2e",
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
  "press-release": "Press release",
  "parliament-answer": "Parliament answer",
  "station-profile": "Station profile",
  "expedition-report": "Expedition report",
  publication: "Publication",
};

export const ENTRY_KIND_LABEL: Record<string, string> = { expedition: "Expedition", programme: "Programme", milestone: "Milestone" };
