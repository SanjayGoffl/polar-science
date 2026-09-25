/**
 * Seed data for the NCPOR Polar Outreach Portal prototype.
 *
 * Honesty note: station names, locations and founding years are real public facts.
 * Expedition narratives, reports, findings, figures and team members are
 * ILLUSTRATIVE — realistic stand-ins for content that would come from NCPOR's
 * expedition reports, DSpace repository and the National Polar Data Center (NPDC).
 */
import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" }),
});

const NPDC = "https://npdc.ncaor.gov.in/";
const NCPOR_SITE = "https://www.ncpor.res.in/";
const art = (n: string) => `/images/art/${n}.svg`;

type Section = [heading: string, body: string];

const stations = [
  {
    slug: "bharati", name: "Bharati", region: "antarctica", kind: "station",
    lat: -69.4078, lng: 76.1953, established: 2012, location: "Larsemann Hills, East Antarctica",
    heroImage: art("bharati"),
    description: "India's third Antarctic research station, built on a rocky promontory in the Larsemann Hills beside Prydz Bay. Its modular design of prefabricated shipping-container units makes it one of the most distinctive research buildings on the continent.",
  },
  {
    slug: "maitri", name: "Maitri", region: "antarctica", kind: "station",
    lat: -70.7667, lng: 11.7333, established: 1989, location: "Schirmacher Oasis, Dronning Maud Land",
    heroImage: art("maitri"),
    description: "India's second permanent Antarctic station, sitting in the Schirmacher Oasis, an ice-free rocky plateau dotted with freshwater lakes. Maitri has hosted year-round teams for more than three decades.",
  },
  {
    slug: "dakshin-gangotri", name: "Dakshin Gangotri", region: "antarctica", kind: "historic",
    lat: -70.0833, lng: 12.0, established: 1983, location: "Ice shelf, Dronning Maud Land",
    heroImage: art("dakshin-gangotri"),
    description: "India's first Antarctic base, built on the ice shelf during the third expedition. It was gradually buried by snow and decommissioned in 1990, and is now used as a supply base.",
  },
  {
    slug: "himadri", name: "Himadri", region: "arctic", kind: "station",
    lat: 78.9236, lng: 11.9306, established: 2008, location: "Ny-Ålesund, Svalbard (Norway)",
    heroImage: art("himadri"),
    description: "India's Arctic research station in the international research village of Ny-Ålesund, on the shore of Kongsfjorden. Scientists study glaciers, the fjord and the Arctic atmosphere here.",
  },
  {
    slug: "himansh", name: "Himansh", region: "himalaya", kind: "station",
    lat: 32.405, lng: 77.61, established: 2016, location: "Chandra Basin, Lahaul-Spiti, Himachal Pradesh",
    heroImage: art("himansh"),
    description: "A high-altitude research station above 4,000 m in the Chandra basin, from which NCPOR glaciologists monitor Himalayan glaciers, the 'Third Pole'.",
  },
  {
    slug: "sutri-dhaka", name: "Sutri Dhaka Glacier", region: "himalaya", kind: "field-site",
    lat: 32.36, lng: 77.5, established: null, location: "Chandra Basin, Himachal Pradesh",
    heroImage: art("glacier"),
    description: "A benchmark glacier in the Chandra basin where stakes, pits and weather stations record how much ice is gained and lost each year.",
  },
];

// Illustrative people (fictional names).
const people = {
  anand: { name: "Dr. Anand Kulkarni", institution: "NCPOR, Goa", expertise: "Sea-ice physics" },
  meera: { name: "Dr. Meera Iyer", institution: "NCPOR, Goa", expertise: "Ice-core geochemistry" },
  farhan: { name: "Farhan Qureshi", institution: "IITM, Pune", expertise: "Atmospheric aerosols" },
  lhamo: { name: "Dr. Tenzin Lhamo", institution: "Wadia Institute of Himalayan Geology", expertise: "Glaciology" },
  priya: { name: "Priya Nair", institution: "NCPOR, Goa", expertise: "Limnology & microbiology" },
  vikram: { name: "Cdr. Vikram Sethi", institution: "Indian Navy (logistics)", expertise: "Expedition logistics" },
  sana: { name: "Dr. Sana Rizvi", institution: "NCPOR, Goa", expertise: "Physical oceanography" },
  arjun: { name: "Arjun Bhattacharya", institution: "University of Calcutta", expertise: "Glacier remote sensing" },
  kavya: { name: "Dr. Kavya Reddy", institution: "NCPOR, Goa", expertise: "Arctic marine biology" },
  rohit: { name: "Rohit Menon", institution: "NCPOR, Goa", expertise: "Data management (NPDC)" },
  dolma: { name: "Pema Dolma", institution: "University of Kashmir", expertise: "Snow hydrology" },
  joseph: { name: "Dr. Joseph Thomas", institution: "NCPOR, Goa", expertise: "Expedition leadership" },
};
type PersonKey = keyof typeof people;

interface ReportSeed {
  slug: string;
  title: string;
  type: "expedition-report" | "publication" | "technical-note";
  authors: string;
  venue?: string;
  publishedOn: string;
  abstract: string;
  project?: string; // project title
  sections: Section[];
}

interface ExpeditionSeed {
  slug: string;
  name: string;
  shortName: string;
  number: number | null;
  year: number;
  season: string;
  region: string;
  station: string;
  summary: string;
  heroImage: string;
  featured?: boolean;
  projects: { title: string; topic: string; lead: string; summary: string }[];
  members: [PersonKey, string][];
  reports: ReportSeed[];
  media: { url: string; caption: string; altText: string }[];
  data: { title: string; parameter: string; format: string; volume: string }[];
  chapters?: {
    kind: string; eyebrow: string; title: string; body: string;
    lat?: number; lng?: number; zoom?: number; image?: string;
    stats?: { label: string; value: string }[];
  }[];
}

/* ------------------------------------------------------------------ */
/* ISEA-43 — full Expedition Story (flagship)                          */
/* ------------------------------------------------------------------ */
const isea43: ExpeditionSeed = {
  slug: "isea-43",
  name: "43rd Indian Scientific Expedition to Antarctica",
  shortName: "ISEA-43",
  number: 43,
  year: 2023,
  season: "Nov 2023 – Mar 2024",
  region: "antarctica",
  station: "bharati",
  featured: true,
  heroImage: art("bharati"),
  summary:
    "A summer campaign based at Bharati station that measured coastal sea ice, drilled shallow ice cores, sampled lakes in the Larsemann Hills and tracked the air above East Antarctica.",
  projects: [
    { title: "Coastal Sea-Ice Observatory", topic: "Sea ice", lead: "Dr. Anand Kulkarni", summary: "Drill-hole and electromagnetic surveys of landfast sea ice in Prydz Bay." },
    { title: "Shallow Ice-Core Programme", topic: "Palaeoclimate", lead: "Dr. Meera Iyer", summary: "Firn and ice cores from the Dålk Glacier margin to reconstruct recent climate." },
    { title: "Antarctic Atmosphere Watch", topic: "Atmosphere", lead: "Farhan Qureshi", summary: "Ozonesondes, black-carbon and aerosol monitoring at Bharati." },
    { title: "Larsemann Lakes Survey", topic: "Lakes & life", lead: "Priya Nair", summary: "Sediment cores and microbial mats from coastal freshwater lakes." },
  ],
  members: [
    ["joseph", "Expedition Leader"],
    ["anand", "Sea-ice lead"],
    ["meera", "Ice-core lead"],
    ["farhan", "Atmospheric scientist"],
    ["priya", "Lake & microbial scientist"],
    ["vikram", "Logistics officer"],
    ["rohit", "Data manager"],
  ],
  reports: [
    {
      slug: "isea-43-expedition-report",
      title: "ISEA-43 Expedition Report: Coastal Cryosphere and Atmosphere Programme, Bharati Station",
      type: "expedition-report",
      authors: "J. Thomas, A. Kulkarni, M. Iyer, F. Qureshi, P. Nair, R. Menon",
      venue: "NCPOR Expedition Report Series (illustrative)",
      publishedOn: "2024-09-15",
      abstract:
        "This report documents the summer scientific programme of the 43rd Indian Scientific Expedition to Antarctica at Bharati station. Observations spanned landfast sea-ice mass balance in Prydz Bay, shallow firn/ice-core recovery from the Dålk Glacier margin, tropospheric and stratospheric ozone profiling, aerosol and equivalent black carbon monitoring, and limnological sampling of eleven lakes in the Larsemann Hills.",
      sections: [
        ["Introduction and logistics",
          "The ISEA-43 summer team of 38 personnel sailed from Cape Town aboard a chartered ice-class vessel and reached the fast-ice edge off Bharati on 29 November 2023. Personnel and cargo were transferred by helicopter over 14 flying days owing to unstable fast ice in the approach channel. The scientific programme comprised four projects coordinated by NCPOR, with participation from partner institutions. Station operations, power generation and waste management followed the Protocol on Environmental Protection to the Antarctic Treaty."],
        ["Landfast sea-ice thickness and snow cover",
          "Sea-ice thickness was measured at 46 drill holes along three transects extending up to 9 km from the coast, complemented by 112 km of ground-based electromagnetic induction profiling. Mean level-ice thickness in early December was 1.62 ± 0.21 m, approximately 0.18 m thinner than the 2015–2022 December mean for the same transects. Snow depth averaged 0.14 m but was highly heterogeneous, exceeding 0.5 m in the lee of grounded icebergs. Flooding at the snow–ice interface was observed at 17% of sites, indicating negative freeboard conditions favourable to snow-ice formation. Break-up of the fast ice in the approach channel occurred on 6 January 2024, roughly 12 days earlier than the recent average."],
        ["Shallow ice-core drilling on the Dålk Glacier margin",
          "Two firn/ice cores of 32.4 m and 28.9 m length were recovered using an electromechanical drill at sites 14 km and 21 km inland of the coast. Cores were logged, sectioned at 5 cm resolution and transported frozen to the NCPOR ice-core laboratory in Goa. Preliminary stable water isotope (δ18O) profiles span approximately 1960–2023 based on annual-layer counting constrained by the 1991 Pinatubo non-sea-salt sulphate marker. Mean annual accumulation was estimated at 0.31 m water equivalent, and δ18O exhibits a warming-consistent enrichment of 0.9‰ over the most recent two decades relative to the 1960–1990 baseline, though this trend is within the range of multi-decadal variability observed in coastal East Antarctic records."],
        ["Atmospheric ozone, aerosol and black carbon monitoring",
          "Eighteen balloon-borne ozonesondes were launched between December and February, capturing the final stages of Antarctic ozone-hole recovery. Total column ozone rose from 262 DU on 2 December to 309 DU by late January. A seven-wavelength aethalometer recorded equivalent black carbon (eBC) concentrations with a median of 6.8 ng m⁻³, with episodic peaks exceeding 40 ng m⁻³ attributed through back-trajectory analysis to ship and station emissions under calm, stable boundary-layer conditions. Aerosol optical depth at 500 nm averaged 0.034, characteristic of pristine Antarctic coastal air."],
        ["Lake sediment and microbial mat sampling in the Larsemann Hills",
          "Eleven freshwater and brackish lakes were sampled for water chemistry, benthic microbial mats and sediment cores. Surface-water conductivity ranged from 45 to 2,310 µS cm⁻¹, reflecting varying marine influence. Six short sediment cores (0.3–0.9 m) were recovered for diatom, pigment and radiocarbon analysis to reconstruct Holocene deglaciation and lake-level history. Cyanobacteria-dominated microbial mats were present in all lakes; 16S rRNA amplicon sequencing is underway to characterise community structure and potential novel psychrotolerant taxa."],
        ["Data management and archival",
          "All observational datasets generated during ISEA-43 are being curated in accordance with the NCPOR data policy. Metadata records following the Directory Interchange Format (DIF) have been submitted to the National Polar Data Center (NPDC), with quality-controlled data scheduled for public release after the standard embargo period. Physical samples, including ice cores and sediment cores, are archived in cold storage facilities at NCPOR, Goa."],
        ["Preliminary conclusions",
          "ISEA-43 recorded thinner-than-average landfast sea ice and earlier break-up in Prydz Bay, consistent with recent low Antarctic sea-ice extent. Ice-core isotope data suggest modest recent enrichment requiring confirmation from longer records. Atmospheric measurements confirm very clean background air with local, episodic pollution signals. Continued multi-year observations at Bharati are essential to separate long-term trends from natural variability."],
      ],
    },
    {
      slug: "prydz-bay-fast-ice-2024",
      title: "Thinning and early break-up of landfast sea ice near Bharati station, East Antarctica, during the 2023–24 season",
      type: "publication",
      authors: "A. Kulkarni, R. Menon, J. Thomas",
      venue: "Sample manuscript (illustrative)",
      publishedOn: "2025-03-10",
      project: "Coastal Sea-Ice Observatory",
      abstract:
        "We present drill-hole and electromagnetic induction measurements of landfast sea ice in Prydz Bay from the 2023–24 season and compare them with an eight-year record from the same transects.",
      sections: [
        ["Background", "Landfast sea ice, which is anchored to the coast, regulates heat and moisture exchange between ocean and atmosphere, provides habitat for ice algae, and serves as a logistic platform for coastal Antarctic stations. Antarctic sea-ice extent reached record lows in 2023, motivating detailed local measurements."],
        ["Methods", "Ice thickness, snow depth and freeboard were measured at 46 drill holes, and continuous thickness profiles were obtained using a ground-based electromagnetic induction instrument calibrated against the drill holes (r² = 0.93)."],
        ["Results", "Mean level-ice thickness was 1.62 ± 0.21 m, 0.18 m below the 2015–2022 mean. Negative freeboard and flooding were found at 17% of sites. Break-up occurred approximately 12 days earlier than average."],
        ["Implications", "Thinner, earlier-breaking fast ice shortens the safe window for over-ice cargo transfer and may alter coastal ecosystem timing. Continued monitoring is needed to establish whether 2023–24 represents an anomaly or an emerging trend."],
      ],
    },
    {
      slug: "dalk-glacier-ice-core-isotopes",
      title: "A six-decade stable isotope record from shallow ice cores on the Dålk Glacier margin, Larsemann Hills",
      type: "publication",
      authors: "M. Iyer, J. Thomas",
      venue: "Sample manuscript (illustrative)",
      publishedOn: "2025-07-22",
      project: "Shallow Ice-Core Programme",
      abstract:
        "Two shallow ice cores recovered during ISEA-43 provide a δ18O and accumulation record spanning approximately 1960–2023 for coastal East Antarctica.",
      sections: [
        ["Background", "Stable water isotopes in polar ice (δ18O) act as a proxy for the temperature at which snow formed. Coastal East Antarctic ice-core records are sparse, limiting understanding of regional climate change."],
        ["Dating", "Annual layers were counted using seasonal cycles in δ18O and sea-salt sodium, and anchored to the 1991 Pinatubo volcanic sulphate peak, giving a dating uncertainty of ±2 years at the base."],
        ["Findings", "Mean accumulation was 0.31 m water equivalent per year. δ18O was enriched by 0.9‰ in 2003–2023 relative to 1960–1990, equivalent to roughly 1 °C of warming using a spatial isotope–temperature slope, although this remains within the range of natural multi-decadal variability."],
      ],
    },
    {
      slug: "bharati-black-carbon-note",
      title: "Technical note: Equivalent black carbon and ozone profiling at Bharati, summer 2023–24",
      type: "technical-note",
      authors: "F. Qureshi",
      venue: "NCPOR Technical Note (illustrative)",
      publishedOn: "2024-11-05",
      project: "Antarctic Atmosphere Watch",
      abstract: "Summary of aethalometer and ozonesonde observations from the ISEA-43 summer programme.",
      sections: [
        ["Instruments", "A seven-wavelength aethalometer sampled ambient air at 5-minute resolution from an inlet 150 m upwind of the station generators. Ozonesondes with electrochemical concentration cell sensors were launched on weather balloons."],
        ["Observations", "Median equivalent black carbon was 6.8 ng m⁻³ with episodic peaks above 40 ng m⁻³ during calm conditions, traced to ship and station exhaust. Total column ozone increased from 262 DU to 309 DU between December and late January as the ozone hole closed."],
      ],
    },
  ],
  media: [
    { url: art("bharati"), caption: "Bharati station in the Larsemann Hills, with fast ice breaking up in Prydz Bay beyond.", altText: "Illustration of a modular research station on low rocky hills beside sea ice under a pale sky." },
    { url: art("voyage"), caption: "The expedition vessel pushing through pack ice on the approach to Bharati.", altText: "Illustration of a red ice-class ship among floating sea ice." },
    { url: art("icecore"), caption: "Annual layers in a firn core from the Dålk Glacier margin: each band is roughly a year of snowfall.", altText: "Horizontal pale-blue and white bands representing layers in an ice core." },
    { url: art("camp"), caption: "Inland drilling camp, 21 km from the coast.", altText: "Illustration of three tents and a flag on a flat snow plain at low sun." },
    { url: art("blueice"), caption: "Blue ice near the glacier margin, where old ice is exposed at the surface.", altText: "Layered blue ridges representing glacier ice." },
    { url: art("aurora"), caption: "Aurora australis seen during the late-season changeover.", altText: "Green and violet aurora over a dark icy landscape with stars." },
  ],
  data: [
    { title: "Prydz Bay fast-ice thickness transects 2023–24", parameter: "Sea-ice thickness, snow depth, freeboard", format: "CSV", volume: "46 drill holes · 112 km EM profiles" },
    { title: "Dålk Glacier shallow ice cores (IC-43-A, IC-43-B)", parameter: "δ18O, δD, major ions", format: "NetCDF", volume: "61 m of core · 1,220 samples" },
    { title: "Bharati ozonesonde profiles, summer 2023–24", parameter: "Ozone partial pressure, temperature, humidity", format: "NASA Ames", volume: "18 profiles" },
    { title: "Larsemann Hills lake chemistry survey", parameter: "Conductivity, pH, nutrients", format: "CSV", volume: "11 lakes" },
  ],
  chapters: [
    {
      kind: "why", eyebrow: "Chapter 1 · Why we went",
      title: "The sea ice was disappearing — and we needed to know why.",
      body: "In 2023 the sea ice around Antarctica shrank to the smallest area ever recorded by satellites. Satellites can see how far the ice spreads, but not how thick it is. So India's 43rd expedition set out to measure the ice by hand, drill into glaciers to read the past, and sample the cleanest air on Earth.",
      image: art("voyage"),
      stats: [{ label: "Team members", value: "38" }, { label: "Days on the ice", value: "112" }, { label: "Km from India", value: "≈ 12,000" }],
    },
    {
      kind: "what", eyebrow: "Chapter 2 · What we studied",
      title: "Four questions, four teams.",
      body: "How thick is the sea ice? What do glaciers remember about past climate? How clean is Antarctic air, and is the ozone hole healing? What lives in lakes that stay frozen most of the year? Each question became a project with its own scientists and equipment.",
      image: art("icecore"),
    },
    {
      kind: "where", eyebrow: "Chapter 3 · Where we went",
      title: "Bharati, on the edge of Prydz Bay.",
      body: "Bharati sits on bare rock in the Larsemann Hills, about 3,000 km south of the southern tip of Africa. The team drilled sea ice up to 9 km offshore, set up an ice-core camp 21 km inland, and visited eleven lakes scattered among the hills.",
      lat: -69.4078, lng: 76.1953, zoom: 8,
      stats: [{ label: "Latitude", value: "69.4° S" }, { label: "Longitude", value: "76.2° E" }],
    },
    {
      kind: "who", eyebrow: "Chapter 4 · Who participated",
      title: "Scientists, engineers, doctors and navy logisticians.",
      body: "An Antarctic expedition is a small town. Alongside the scientists were engineers who kept the power running, a doctor, cooks, helicopter crews and data managers who made sure every measurement would reach the National Polar Data Center.",
      image: art("camp"),
    },
    {
      kind: "found", eyebrow: "Chapter 5 · What we found",
      title: "Thinner ice, an earlier melt, and a record written in snow.",
      body: "The sea ice was about 18 cm thinner than usual and broke up almost two weeks early. Ice cores revealed about 60 years of snowfall, with hints of recent warming that need longer records to confirm. And the air was remarkably clean, apart from brief puffs of soot from ships and generators.",
      image: art("blueice"),
      stats: [{ label: "Mean ice thickness", value: "1.62 m" }, { label: "Thinner than usual", value: "18 cm" }, { label: "Earlier break-up", value: "12 days" }],
    },
    {
      kind: "data", eyebrow: "Chapter 6 · Data generated",
      title: "Every measurement becomes open data.",
      body: "Measurements are archived with the National Polar Data Center (NPDC), NCPOR's official data portal, so scientists anywhere can reuse them. Here's what this expedition contributed.",
    },
    {
      kind: "publications", eyebrow: "Chapter 7 · Publications",
      title: "From notebooks to papers.",
      body: "Field observations become reports and scientific papers. Open any of them and tap “Explain this simply” for a plain-language version with its source clearly cited.",
    },
    {
      kind: "media", eyebrow: "Chapter 8 · Photos",
      title: "Life at the bottom of the world.",
      body: "Scenes from the 2023–24 summer season at Bharati.",
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Arctic 2024 — second full story                                      */
/* ------------------------------------------------------------------ */
const arctic2024: ExpeditionSeed = {
  slug: "arctic-2024",
  name: "Indian Arctic Expedition 2024 — Kongsfjorden Summer Campaign",
  shortName: "Arctic 2024",
  number: null,
  year: 2024,
  season: "Jun – Sep 2024",
  region: "arctic",
  station: "himadri",
  heroImage: art("himadri"),
  summary:
    "Summer fieldwork from Himadri station tracking glacier retreat, warm Atlantic water entering Kongsfjorden and the fjord's changing plankton.",
  projects: [
    { title: "Kongsfjorden Glacier Front Monitoring", topic: "Glaciers", lead: "Arjun Bhattacharya", summary: "Time-lapse cameras and drone surveys of tidewater glacier fronts." },
    { title: "IndArc Fjord Observatory", topic: "Ocean", lead: "Dr. Sana Rizvi", summary: "Moored and ship-based ocean measurements in Kongsfjorden." },
    { title: "Arctic Plankton Watch", topic: "Marine life", lead: "Dr. Kavya Reddy", summary: "Seasonal plankton and microbial sampling." },
  ],
  members: [
    ["sana", "Team Leader & oceanographer"],
    ["arjun", "Glacier remote sensing"],
    ["kavya", "Marine biologist"],
    ["rohit", "Data manager"],
  ],
  reports: [
    {
      slug: "arctic-2024-expedition-report",
      title: "Indian Arctic Expedition 2024: Glacier–Ocean Interactions in Kongsfjorden, Svalbard",
      type: "expedition-report",
      authors: "S. Rizvi, A. Bhattacharya, K. Reddy, R. Menon",
      venue: "NCPOR Arctic Report Series (illustrative)",
      publishedOn: "2025-02-20",
      abstract:
        "Summer 2024 observations from Himadri station on tidewater glacier retreat, Atlantic Water intrusion and plankton community change in Kongsfjorden, Svalbard.",
      sections: [
        ["Introduction", "Kongsfjorden is a glacial fjord on the west coast of Spitsbergen, influenced by warm, saline Atlantic Water carried north by the West Spitsbergen Current and by cold, fresh meltwater from tidewater glaciers. It is a sentinel site for Arctic change. The 2024 campaign operated from Himadri station between June and September."],
        ["Glacier front monitoring", "Terminus positions of Kronebreen and Kongsvegen were mapped using automated time-lapse cameras and six uncrewed aerial vehicle photogrammetry surveys. Kronebreen retreated a net 186 m along its centreline between June and September, with calving flux peaking in late July coincident with maximum near-surface ocean temperatures. Digital elevation models indicate surface lowering of up to 2.4 m over the melt season near the terminus."],
        ["Fjord hydrography and the IndArc mooring", "The IndArc sub-surface mooring, first deployed by India in Kongsfjorden in 2014, was recovered, serviced and redeployed at approximately 180 m depth. Records show Atlantic Water (temperature > 3 °C, salinity > 34.9) occupying the inner fjord for 61 days, compared with a 2015–2023 mean of 38 days. Ship-based CTD transects documented a strongly stratified surface layer of glacial meltwater up to 15 m thick near the glacier fronts."],
        ["Plankton and microbial communities", "Weekly net hauls and water samples were collected at five stations. Relative abundance of Atlantic-origin zooplankton, including Calanus finmarchicus, increased relative to the Arctic species Calanus glacialis. Phytoplankton biomass (chlorophyll-a) peaked at 4.1 mg m⁻³ in early June, earlier than the historical May–June transition."],
        ["Data management", "Datasets are being archived with the National Polar Data Center (NPDC) with DIF-compliant metadata, and mooring data are shared with the Svalbard Integrated Arctic Earth Observing System (SIOS) framework."],
      ],
    },
    {
      slug: "kongsfjorden-atlantification",
      title: "Longer Atlantic Water residence in Kongsfjorden: evidence from a decade of IndArc mooring records",
      type: "publication",
      authors: "S. Rizvi, R. Menon",
      venue: "Sample manuscript (illustrative)",
      publishedOn: "2025-06-01",
      project: "IndArc Fjord Observatory",
      abstract: "Ten years of moored temperature and salinity records show Atlantic Water occupying the inner fjord for progressively longer each year.",
      sections: [
        ["Background", "'Atlantification' describes the northward expansion of warm, salty Atlantic Water into the Arctic Ocean and its fjords, which reduces sea ice, enhances glacier melt and reshapes ecosystems."],
        ["Findings", "Annual Atlantic Water residence in inner Kongsfjorden increased from about 25 days in 2015 to 61 days in 2024. Winter fjord-ice cover has been largely absent since 2016."],
      ],
    },
  ],
  media: [
    { url: art("himadri"), caption: "Midnight sun over Kongsfjorden, with Himadri station on the shore of Ny-Ålesund.", altText: "Illustration of a fjord with snowy mountains, low sun and small houses on the shore." },
    { url: art("ocean"), caption: "Kongsfjorden waters, where warm Atlantic Water now stays longer each summer.", altText: "Illustration of dark sea with scattered ice under a grey sky." },
    { url: art("aurora"), caption: "Winter aurora borealis above the research village.", altText: "Green aurora in a starry night sky over dark hills." },
  ],
  data: [
    { title: "IndArc mooring records 2023–24", parameter: "Temperature, salinity, currents", format: "NetCDF", volume: "1 mooring · 12 months" },
    { title: "Kronebreen terminus positions, summer 2024", parameter: "Glacier front position, DEMs", format: "GeoTIFF / Shapefile", volume: "6 UAV surveys" },
    { title: "Kongsfjorden plankton time series 2024", parameter: "Chlorophyll-a, zooplankton counts", format: "CSV", volume: "5 stations · 14 weeks" },
  ],
  chapters: [
    { kind: "why", eyebrow: "Chapter 1 · Why we went", title: "The Arctic is warming nearly four times faster than the rest of the planet.", body: "Svalbard's fjords are where the warming ocean meets melting glaciers. India's Himadri station sits right there, making it an ideal place to watch the Arctic change up close.", image: art("himadri"), stats: [{ label: "Station since", value: "2008" }, { label: "Days of daylight", value: "≈ 120" }] },
    { kind: "what", eyebrow: "Chapter 2 · What we studied", title: "Glaciers, ocean and plankton — one connected system.", body: "Warm water melts glaciers from below; meltwater changes the fjord; the fjord's changes reshape what lives there. The team studied all three together.", image: art("ocean") },
    { kind: "where", eyebrow: "Chapter 3 · Where we went", title: "Ny-Ålesund, Svalbard — 1,200 km from the North Pole.", body: "Himadri is one of about a dozen national stations in Ny-Ålesund, one of the northernmost research villages in the world.", lat: 78.9236, lng: 11.9306, zoom: 8, stats: [{ label: "Latitude", value: "78.9° N" }] },
    { kind: "who", eyebrow: "Chapter 4 · Who participated", title: "A small team, rotating through the summer.", body: "Oceanographers, glaciologists and biologists took turns at Himadri, supported by data managers back in Goa." },
    { kind: "found", eyebrow: "Chapter 5 · What we found", title: "Warm water stayed longer. The glacier pulled back.", body: "Atlantic Water filled the inner fjord for 61 days, far longer than the usual 38. Kronebreen glacier retreated 186 m in a single summer, and Atlantic plankton species became more common than Arctic ones.", image: art("blueice"), stats: [{ label: "Glacier retreat", value: "186 m" }, { label: "Warm-water days", value: "61" }] },
    { kind: "data", eyebrow: "Chapter 6 · Data generated", title: "A decade-long ocean record keeps growing.", body: "The IndArc mooring has recorded the fjord since 2014. This year's data joins the archive at NPDC." },
    { kind: "publications", eyebrow: "Chapter 7 · Publications", title: "What the science says.", body: "Read the reports, or let the portal explain them simply, with sources." },
    { kind: "media", eyebrow: "Chapter 8 · Photos", title: "Summer in the high Arctic.", body: "Scenes from Kongsfjorden." },
  ],
};

/* ------------------------------------------------------------------ */
/* Shorter timeline expeditions                                         */
/* ------------------------------------------------------------------ */
function brief(e: Omit<ExpeditionSeed, "projects" | "members" | "media" | "data"> & Partial<ExpeditionSeed>): ExpeditionSeed {
  return { projects: [], members: [], media: [{ url: e.heroImage, caption: e.summary, altText: `Illustration for ${e.shortName}` }], data: [], ...e };
}

const others: ExpeditionSeed[] = [
  brief({
    slug: "isea-3", name: "3rd Indian Scientific Expedition to Antarctica", shortName: "ISEA-3", number: 3, year: 1983,
    season: "Dec 1983 – Mar 1984", region: "antarctica", station: "dakshin-gangotri", heroImage: art("dakshin-gangotri"),
    summary: "The expedition that built Dakshin Gangotri, India's first permanent base in Antarctica, on the ice shelf of Dronning Maud Land.",
    reports: [{
      slug: "isea-3-report", title: "Establishment of Dakshin Gangotri: Report of the Third Indian Expedition to Antarctica", type: "expedition-report",
      authors: "Expedition members (illustrative summary)", venue: "Historical summary (illustrative)", publishedOn: "1985-06-01",
      abstract: "Summary of the construction and first wintering of India's first Antarctic station.",
      sections: [
        ["Construction", "Prefabricated modules were landed on the ice shelf and assembled into a station raised on steel stilts to reduce snow accumulation. The base included living quarters, a laboratory, a radio room and generator housing."],
        ["First wintering", "A team wintered at the station, maintaining meteorological, geomagnetic and radio-communication observations through the polar night."],
        ["Legacy", "Snow accumulation progressively buried the station, and it was decommissioned in 1990 after Maitri became operational. Its experience informed the design of all later Indian polar stations."],
      ],
    }],
  }),
  brief({
    slug: "isea-9", name: "9th Indian Scientific Expedition to Antarctica", shortName: "ISEA-9", number: 9, year: 1989,
    season: "Dec 1989 – Mar 1990", region: "antarctica", station: "maitri", heroImage: art("maitri"),
    summary: "Completion of Maitri station in the Schirmacher Oasis, which has been India's rock-based home in Antarctica ever since.",
    reports: [{
      slug: "isea-9-report", title: "Maitri Station Commissioning: Summary of the Ninth Expedition", type: "expedition-report",
      authors: "Expedition members (illustrative summary)", venue: "Historical summary (illustrative)", publishedOn: "1991-01-15",
      abstract: "Commissioning of Maitri station on the ice-free Schirmacher Oasis.",
      sections: [
        ["Site selection", "The Schirmacher Oasis offered bedrock foundations, freshwater lakes and relative proximity to the ice-shelf landing sites, avoiding the snow-burial problem that affected Dakshin Gangotri."],
        ["Station systems", "Maitri was equipped with year-round power generation, heated living modules and laboratories for meteorology, geology and biology."],
      ],
    }],
  }),
  brief({
    slug: "isea-31", name: "31st Indian Scientific Expedition to Antarctica", shortName: "ISEA-31", number: 31, year: 2011,
    season: "Nov 2011 – Mar 2012", region: "antarctica", station: "bharati", heroImage: art("bharati"),
    summary: "The expedition that completed and commissioned Bharati station in the Larsemann Hills, India's third Antarctic base.",
    reports: [{
      slug: "isea-31-report", title: "Bharati Station: Construction and Commissioning Summary", type: "expedition-report",
      authors: "Expedition members (illustrative summary)", venue: "Historical summary (illustrative)", publishedOn: "2012-10-01",
      abstract: "Construction of a modular research station built from prefabricated container units.",
      sections: [
        ["Design", "Bharati was assembled from over a hundred prefabricated container modules clad in an insulated shell, designed for energy efficiency and minimal environmental footprint under the Antarctic Treaty's environmental protocol."],
        ["Science goals", "The station was sited to support research on the East Antarctic coast, continental break-up history, and to enable satellite ground-station operations."],
      ],
    }],
  }),
  brief({
    slug: "isea-45", name: "45th Indian Scientific Expedition to Antarctica", shortName: "ISEA-45", number: 45, year: 2025,
    season: "Nov 2025 – Mar 2026", region: "antarctica", station: "maitri", heroImage: art("aurora"),
    summary: "A Maitri-based season focused on lake ecosystems of the Schirmacher Oasis and preparations for next-generation station facilities.",
    reports: [{
      slug: "isea-45-report", title: "ISEA-45 Preliminary Report: Schirmacher Oasis Lake Ecosystems", type: "expedition-report",
      authors: "P. Nair, J. Thomas (illustrative)", venue: "Preliminary report (illustrative)", publishedOn: "2026-06-30",
      abstract: "Preliminary findings from limnological surveys around Maitri.",
      sections: [
        ["Lake survey", "Twenty-two lakes in the Schirmacher Oasis were surveyed for ice-cover duration, water chemistry and benthic mats. Ice-free periods were on average 9 days longer than a 2010s baseline, with the largest changes in shallow lakes below 3 m depth."],
        ["Ecological implications", "Longer open-water periods increase light availability for photosynthetic mats but also expose lakes to wind-driven mixing and evaporation, potentially increasing salinity in closed basins."],
      ],
    }],
  }),
  brief({
    slug: "arctic-2008", name: "Indian Arctic Expedition 2008 — Himadri Inauguration", shortName: "Arctic 2008", number: null, year: 2008,
    season: "Jun – Aug 2008", region: "arctic", station: "himadri", heroImage: art("himadri"),
    summary: "The season Himadri opened in Ny-Ålesund, giving India a permanent foothold for Arctic science.",
    reports: [{
      slug: "arctic-2008-report", title: "Opening of Himadri: India's Arctic Research Station", type: "expedition-report",
      authors: "Expedition members (illustrative summary)", venue: "Historical summary (illustrative)", publishedOn: "2009-02-01",
      abstract: "Establishment of Himadri and its initial research programme.",
      sections: [
        ["Station", "Himadri occupies a two-storey building in the international research village of Ny-Ålesund, with laboratory space, accommodation and instrument access to the fjord and nearby glaciers."],
        ["Initial programme", "Early studies focused on Arctic microbiology, glaciology of nearby glaciers and atmospheric sciences, building links with international partners in Ny-Ålesund."],
      ],
    }],
  }),
  brief({
    slug: "chandra-2023", name: "Chandra Basin Glaciology Campaign 2023", shortName: "Himalaya 2023", number: null, year: 2023,
    season: "Jun – Oct 2023", region: "himalaya", station: "himansh", heroImage: art("himansh"),
    summary: "Mass-balance measurements on Sutri Dhaka and neighbouring glaciers from Himansh, tracking how fast the 'Third Pole' is losing ice.",
    reports: [{
      slug: "chandra-2023-mass-balance", title: "Glaciological Mass Balance of Sutri Dhaka Glacier, Chandra Basin, 2022–23", type: "expedition-report",
      authors: "T. Lhamo, P. Dolma (illustrative)", venue: "NCPOR Himalayan Cryosphere Report (illustrative)", publishedOn: "2024-03-12",
      abstract: "Annual glaciological mass balance from stake and pit measurements on Sutri Dhaka glacier.",
      sections: [
        ["Methods", "Ablation was measured at 42 bamboo stakes drilled into the ice across the glacier, and accumulation in snow pits and cores at higher elevations. Point measurements were integrated over the glacier hypsometry to obtain the specific mass balance."],
        ["Results", "The 2022–23 glacier-wide mass balance was −0.94 m water equivalent, more negative than the 2014–2022 mean of −0.71 m w.e. The equilibrium-line altitude rose to approximately 5,190 m a.s.l. Debris-free ablation zones showed the greatest losses."],
        ["Significance", "Glaciers of the Chandra basin feed the Chenab river system. Sustained negative balance reduces long-term water storage and increases the risk of glacial lake formation downstream."],
      ],
    }],
    projects: [{ title: "Chandra Basin Mass Balance", topic: "Glaciers", lead: "Dr. Tenzin Lhamo", summary: "Stake and pit network on benchmark glaciers." }],
    members: [["lhamo", "Campaign lead"], ["dolma", "Snow hydrologist"]],
    data: [{ title: "Sutri Dhaka stake network 2022–23", parameter: "Surface mass balance", format: "CSV", volume: "42 stakes · 6 pits" }],
    media: [
      { url: art("himansh"), caption: "Himansh field camp below the peaks of the Chandra basin at dusk.", altText: "Illustration of snowy Himalayan peaks at dusk with tents in the foreground." },
      { url: art("glacier"), caption: "Sutri Dhaka glacier, a benchmark for Himalayan ice loss.", altText: "Illustration of a glacier valley between snow-capped mountains." },
    ],
  }),
  brief({
    slug: "sutri-dhaka-2025", name: "Sutri Dhaka Automatic Weather Station Upgrade 2025", shortName: "Himalaya 2025", number: null, year: 2025,
    season: "Jul – Sep 2025", region: "himalaya", station: "sutri-dhaka", heroImage: art("glacier"),
    summary: "Installation of an upgraded high-altitude weather station on Sutri Dhaka glacier to measure the energy that drives melting.",
    reports: [{
      slug: "sutri-dhaka-aws-2025", title: "Technical Note: High-Altitude Automatic Weather Station on Sutri Dhaka Glacier", type: "technical-note",
      authors: "P. Dolma (illustrative)", venue: "NCPOR Technical Note (illustrative)", publishedOn: "2025-12-01",
      abstract: "Configuration and first-season results from a glacier surface automatic weather station.",
      sections: [
        ["Configuration", "The station measures air temperature, humidity, wind, four-component radiation and snow depth at 10-minute intervals, powered by solar panels with satellite telemetry."],
        ["First results", "Net shortwave radiation dominated the surface energy balance in July–August, supplying over 70% of melt energy, highlighting the sensitivity of melt to surface albedo and hence to dust and black carbon deposition."],
      ],
    }],
  }),
];

const expeditions = [isea43, arctic2024, ...others];

async function main() {
  // wipe (children first)
  await db.aIContentSource.deleteMany();
  await db.aIContent.deleteMany();
  await db.fieldEntry.deleteMany();
  await db.reportSection.deleteMany();
  await db.report.deleteMany();
  await db.project.deleteMany();
  await db.media.deleteMany();
  await db.dataProduct.deleteMany();
  await db.storyChapter.deleteMany();
  await db.expeditionMember.deleteMany();
  await db.person.deleteMany();
  await db.expedition.deleteMany();
  await db.station.deleteMany();

  const stationIds: Record<string, string> = {};
  for (const s of stations) {
    // Station names, locations and founding years are public facts; point to NCPOR for them.
    const row = await db.station.create({ data: { ...s, sourceUrl: NCPOR_SITE } });
    stationIds[s.slug] = row.id;
  }

  const personIds: Partial<Record<PersonKey, string>> = {};
  for (const [key, p] of Object.entries(people) as [PersonKey, (typeof people)[PersonKey]][]) {
    personIds[key] = (await db.person.create({ data: p })).id;
  }

  for (const e of expeditions) {
    const st = stations.find((s) => s.slug === e.station)!;
    const exp = await db.expedition.create({
      data: {
        slug: e.slug, name: e.name, shortName: e.shortName, number: e.number, year: e.year,
        season: e.season, region: e.region, stationId: stationIds[e.station],
        lat: st.lat, lng: st.lng, summary: e.summary, heroImage: e.heroImage,
        featured: e.featured ?? false, hasStory: !!e.chapters,
      },
    });

    const projectIds: Record<string, string> = {};
    for (const p of e.projects) {
      projectIds[p.title] = (await db.project.create({ data: { ...p, expeditionId: exp.id } })).id;
    }
    for (const [key, role] of e.members) {
      await db.expeditionMember.create({ data: { expeditionId: exp.id, personId: personIds[key]!, role } });
    }
    for (const r of e.reports) {
      await db.report.create({
        data: {
          slug: r.slug, title: r.title, type: r.type, authors: r.authors, venue: r.venue,
          publishedOn: new Date(r.publishedOn), abstract: r.abstract, expeditionId: exp.id,
          projectId: r.project ? projectIds[r.project] : undefined,
          sections: {
            create: r.sections.map(([heading, body], i) => ({ order: i, number: String(i + 1), heading, body })),
          },
        },
      });
    }
    for (const m of e.media) {
      await db.media.create({ data: { ...m, type: "photo", credit: "Illustration · NCPOR outreach prototype", expeditionId: exp.id } });
    }
    for (const d of e.data) {
      await db.dataProduct.create({ data: { ...d, npdcUrl: NPDC, expeditionId: exp.id } });
    }
    for (const [i, c] of (e.chapters ?? []).entries()) {
      await db.storyChapter.create({
        data: { ...c, order: i, stats: c.stats ? JSON.stringify(c.stats) : null, expeditionId: exp.id },
      });
    }
  }

  // A few already-approved field notes so station pages aren't empty,
  // plus one pending entry for the admin review screen.
  const now = Date.now();
  const day = 86_400_000;
  await db.fieldEntry.createMany({
    data: [
      {
        id: "seed-0001-bharati", stationId: stationIds["bharati"], activity: "Sea-ice drilling",
        notes: "Transect B, hole 12: ice 1.48 m, snow 0.22 m, slight flooding at the snow-ice interface. Seal breathing hole 40 m north, so we kept our distance.",
        submittedBy: "A. Kulkarni", capturedAt: new Date(now - 9 * day), syncedAt: new Date(now - 8 * day),
        reviewStatus: "approved", reviewedAt: new Date(now - 7 * day), photoUrl: art("bharati"),
      },
      {
        id: "seed-0002-maitri", stationId: stationIds["maitri"], activity: "Lake sampling",
        notes: "Priyadarshini Lake still 80% ice-covered. Collected 3 water samples and a microbial mat scrape from the moat along the shore.",
        submittedBy: "P. Nair", capturedAt: new Date(now - 5 * day), syncedAt: new Date(now - 5 * day),
        reviewStatus: "approved", reviewedAt: new Date(now - 4 * day), photoUrl: art("maitri"),
      },
      {
        id: "seed-0003-himadri", stationId: stationIds["himadri"], activity: "Glacier observation",
        notes: "Large calving event at Kronebreen around 14:20 local time. Time-lapse camera 2 caught it. Brash ice extended ~1 km down-fjord.",
        submittedBy: "A. Bhattacharya", capturedAt: new Date(now - 2 * day), syncedAt: new Date(now - 2 * day),
        reviewStatus: "pending",
      },
    ],
  });

  const counts = {
    stations: await db.station.count(), expeditions: await db.expedition.count(),
    reports: await db.report.count(), sections: await db.reportSection.count(),
    chapters: await db.storyChapter.count(), fieldEntries: await db.fieldEntry.count(),
  };
  console.log("Seeded:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
