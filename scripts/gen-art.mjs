// Generates the editorial SVG "plates" used as imagery across the portal.
// Deterministic (seeded) so re-running produces identical files.
// Run: node scripts/gen-art.mjs
import { mkdirSync, writeFileSync } from "node:fs";

const W = 1600;
const H = 1000;
const OUT = "public/images/art";
mkdirSync(OUT, { recursive: true });

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Midpoint-displacement ridge line -> closed path to the bottom of the frame.
function ridge(r, base, amp, rough, peaks = null) {
  const n = 64;
  let pts = new Array(n + 1).fill(0);
  let step = n;
  let a = amp;
  pts[0] = (r() - 0.5) * amp;
  pts[n] = (r() - 0.5) * amp;
  while (step > 1) {
    const half = step / 2;
    for (let i = half; i < n; i += step) {
      pts[i] = (pts[i - half] + pts[i + half]) / 2 + (r() - 0.5) * a;
    }
    a *= rough;
    step = half;
  }
  if (peaks) {
    pts = pts.map((v, i) => {
      const x = i / n;
      let bump = 0;
      for (const p of peaks) bump += p.h * Math.exp(-((x - p.x) ** 2) / (2 * p.w ** 2));
      return v - bump;
    });
  }
  const coords = pts.map((v, i) => [(i / n) * W, base + v]);
  return coords;
}

const toPath = (coords) =>
  `M0,${H} L` + coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L") + ` L${W},${H} Z`;

// Snow caps: clip the ridge polygon to a band near its crest.
function snowCap(coords, depth) {
  const top = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L");
  const bottom = [...coords]
    .reverse()
    .map(([x, y]) => `${x.toFixed(1)},${(y + depth * (0.4 + 0.6 * Math.abs(Math.sin(x / 90)))).toFixed(1)}`)
    .join(" L");
  return `M${top} L${bottom} Z`;
}

function station(x, y, s, color, kind) {
  if (kind === "bharati") {
    // Container-module building on stilts
    return `<g fill="${color}">
      <rect x="${x}" y="${y - 46 * s}" width="${170 * s}" height="${40 * s}" rx="${3 * s}"/>
      <rect x="${x + 20 * s}" y="${y - 62 * s}" width="${120 * s}" height="${18 * s}"/>
      ${[0, 1, 2, 3, 4].map((i) => `<rect x="${x + 10 * s + i * 38 * s}" y="${y - 8 * s}" width="${5 * s}" height="${12 * s}"/>`).join("")}
      <rect x="${x + 180 * s}" y="${y - 110 * s}" width="${3 * s}" height="${110 * s}"/>
      <circle cx="${x + 181 * s}" cy="${y - 112 * s}" r="${6 * s}"/>
    </g>`;
  }
  if (kind === "hut") {
    return `<g fill="${color}">
      <rect x="${x}" y="${y - 30 * s}" width="${70 * s}" height="${30 * s}"/>
      <polygon points="${x - 6 * s},${y - 30 * s} ${x + 35 * s},${y - 56 * s} ${x + 76 * s},${y - 30 * s}"/>
      <rect x="${x + 90 * s}" y="${y - 22 * s}" width="${40 * s}" height="${22 * s}"/>
      <polygon points="${x + 86 * s},${y - 22 * s} ${x + 110 * s},${y - 38 * s} ${x + 134 * s},${y - 22 * s}"/>
    </g>`;
  }
  if (kind === "tents") {
    return `<g fill="${color}">
      ${[0, 1, 2].map((i) => `<polygon points="${x + i * 60 * s},${y} ${x + i * 60 * s + 24 * s},${y - 32 * s} ${x + i * 60 * s + 48 * s},${y}"/>`).join("")}
      <rect x="${x + 190 * s}" y="${y - 60 * s}" width="${2 * s}" height="${60 * s}"/>
      <polygon points="${x + 192 * s},${y - 60 * s} ${x + 222 * s},${y - 52 * s} ${x + 192 * s},${y - 44 * s}"/>
    </g>`;
  }
  if (kind === "maitri") {
    return `<g fill="${color}">
      <rect x="${x}" y="${y - 36 * s}" width="${220 * s}" height="${36 * s}"/>
      <rect x="${x + 30 * s}" y="${y - 54 * s}" width="${60 * s}" height="${18 * s}"/>
      <rect x="${x + 150 * s}" y="${y - 80 * s}" width="${4 * s}" height="${44 * s}"/>
      <rect x="${x + 240 * s}" y="${y - 22 * s}" width="${50 * s}" height="${22 * s}" rx="${10 * s}"/>
    </g>`;
  }
  return "";
}

function ship(x, y, s, color) {
  return `<g fill="${color}">
    <polygon points="${x},${y} ${x + 260 * s},${y} ${x + 240 * s},${y + 28 * s} ${x + 20 * s},${y + 28 * s}"/>
    <rect x="${x + 150 * s}" y="${y - 48 * s}" width="${70 * s}" height="${48 * s}"/>
    <rect x="${x + 170 * s}" y="${y - 70 * s}" width="${30 * s}" height="${22 * s}"/>
    <rect x="${x + 60 * s}" y="${y - 90 * s}" width="${4 * s}" height="${90 * s}"/>
    <line x1="${x + 62 * s}" y1="${y - 88 * s}" x2="${x + 140 * s}" y2="${y - 10 * s}" stroke="${color}" stroke-width="${2 * s}"/>
  </g>`;
}

function stars(r, n, maxY) {
  let s = "";
  for (let i = 0; i < n; i++) {
    const x = r() * W;
    const y = r() * maxY;
    s += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(r() * 1.6 + 0.3).toFixed(2)}" fill="#fff" opacity="${(r() * 0.7 + 0.2).toFixed(2)}"/>`;
  }
  return s;
}

function aurora(r, colors) {
  let s = `<g filter="url(#blur)" opacity="0.85">`;
  colors.forEach((c, k) => {
    const y0 = 180 + k * 70;
    let d = `M-50,${y0}`;
    for (let x = 0; x <= W + 100; x += 100) d += ` Q${x + 50},${y0 + (r() - 0.5) * 220} ${x + 100},${y0 + (r() - 0.5) * 120}`;
    s += `<path d="${d}" stroke="${c}" stroke-width="${60 - k * 12}" fill="none" stroke-linecap="round"/>`;
  });
  return s + `</g>`;
}

function floes(r, y0, y1, color, n) {
  let s = "";
  for (let i = 0; i < n; i++) {
    const cx = r() * W;
    const cy = y0 + r() * (y1 - y0);
    const w = 20 + r() * 120 * ((cy - y0) / (y1 - y0) + 0.3);
    const h = w * (0.12 + r() * 0.08);
    s += `<ellipse cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" rx="${w.toFixed(0)}" ry="${h.toFixed(0)}" fill="${color}" opacity="${(0.7 + r() * 0.3).toFixed(2)}"/>`;
  }
  return s;
}

function svg({ seed, sky, sun, starsN = 0, auroraColors, layers = [], sea, floeColor, floeN = 0, extras = "", stripes }) {
  const r = rng(seed);
  let body = "";
  body += `<rect width="${W}" height="${H}" fill="url(#sky)"/>`;
  if (starsN) body += stars(r, starsN, H * 0.6);
  if (auroraColors) body += aurora(r, auroraColors);
  if (sun) body += `<circle cx="${sun.x}" cy="${sun.y}" r="${sun.r * 3}" fill="${sun.color}" opacity="0.18" filter="url(#blur)"/><circle cx="${sun.x}" cy="${sun.y}" r="${sun.r}" fill="${sun.color}"/>`;
  if (stripes) {
    // ice-core cross section
    let y = 0;
    let k = 0;
    while (y < H) {
      const h = 6 + r() * 40;
      body += `<rect x="0" y="${y.toFixed(1)}" width="${W}" height="${h.toFixed(1)}" fill="${stripes[k % stripes.length]}" opacity="${(0.55 + r() * 0.45).toFixed(2)}"/>`;
      y += h;
      k += 1 + Math.floor(r() * 2);
    }
    body += `<circle cx="${W * 0.62}" cy="${H * 0.46}" r="4" fill="#fff" opacity=".8"/><circle cx="${W * 0.3}" cy="${H * 0.7}" r="3" fill="#fff" opacity=".7"/><circle cx="${W * 0.8}" cy="${H * 0.2}" r="5" fill="#fff" opacity=".6"/>`;
  }
  for (const L of layers) {
    const coords = ridge(r, L.base, L.amp, L.rough ?? 0.55, L.peaks);
    body += `<path d="${toPath(coords)}" fill="${L.color}"/>`;
    if (L.snow) body += `<path d="${snowCap(coords, L.snow.depth)}" fill="${L.snow.color}" opacity="${L.snow.opacity ?? 0.95}"/>`;
    if (L.after) body += L.after;
  }
  if (sea) {
    body += `<rect x="0" y="${sea.y}" width="${W}" height="${H - sea.y}" fill="url(#sea)"/>`;
    for (let i = 0; i < 40; i++) {
      const y = sea.y + 10 + r() * (H - sea.y - 10);
      const x = r() * W;
      body += `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${(20 + r() * 120).toFixed(0)}" height="1.5" fill="#fff" opacity="${(0.1 + r() * 0.2).toFixed(2)}"/>`;
    }
  }
  if (floeN) body += floes(r, sea ? sea.y + 8 : H * 0.7, H, floeColor, floeN);
  body += extras;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient>
  <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sea?.color?.[0] ?? "#000"}"/><stop offset="1" stop-color="${sea?.color?.[1] ?? "#000"}"/></linearGradient>
  <filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="30"/></filter>
  <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.09 0"/></filter>
</defs>
${body}
<rect width="${W}" height="${H}" filter="url(#grain)"/>
</svg>`;
}

const plates = {
  // Bharati — Larsemann Hills: low rocky hills meeting sea ice
  bharati: svg({
    seed: 11,
    sky: ["#9fc4dd", "#e9f1f5"],
    sun: { x: 380, y: 230, r: 34, color: "#fff6e0" },
    layers: [
      { base: 560, amp: 90, color: "#b7c9d6" },
      { base: 640, amp: 120, rough: 0.6, color: "#5c6770", snow: { depth: 16, color: "#eef4f7", opacity: 0.8 },
        after: station(1120, 604, 1.2, "#1f2a33", "bharati") },
    ],
    sea: { y: 720, color: ["#c9dce7", "#9db7c8"] },
    floeColor: "#f5fafc",
    floeN: 70,
  }),
  // Maitri — Schirmacher Oasis: flat plateau, frozen lakes
  maitri: svg({
    seed: 22,
    sky: ["#7fa8c9", "#dfe9f0"],
    sun: { x: 300, y: 300, r: 28, color: "#fffaf0" },
    layers: [
      { base: 520, amp: 30, color: "#dbe7ee" },
      { base: 640, amp: 60, rough: 0.5, color: "#6b6a6a", snow: { depth: 10, color: "#e6eef2", opacity: 0.6 },
        after: station(900, 628, 1.1, "#2b2b2e", "maitri") },
      { base: 790, amp: 20, color: "#a9c6d8" },
    ],
    extras: `<ellipse cx="420" cy="860" rx="260" ry="28" fill="#cfe3ee" opacity=".9"/><ellipse cx="1180" cy="900" rx="200" ry="20" fill="#cfe3ee" opacity=".9"/>`,
  }),
  // Dakshin Gangotri — 1983 ice-shelf station, overcast
  "dakshin-gangotri": svg({
    seed: 33,
    sky: ["#aab6bf", "#e6e9eb"],
    layers: [
      { base: 600, amp: 12, rough: 0.4, color: "#f2f5f7", after: station(700, 598, 1.1, "#3a4148", "hut") },
      { base: 700, amp: 8, color: "#dde5ea" },
    ],
  }),
  // Himadri — Ny-Ålesund fjord, midnight sun
  himadri: svg({
    seed: 44,
    sky: ["#f2b8a0", "#fde8d6"],
    sun: { x: 1100, y: 470, r: 40, color: "#ffd9a8" },
    layers: [
      { base: 520, amp: 160, rough: 0.6, color: "#8d94a8", snow: { depth: 70, color: "#f7f1ee" } },
      { base: 620, amp: 90, color: "#50586b", snow: { depth: 24, color: "#ece6e4", opacity: 0.7 },
        after: station(300, 610, 1, "#2a2230", "hut") },
    ],
    sea: { y: 660, color: ["#e8b9a4", "#7d7f95"] },
    floeColor: "#fff",
    floeN: 18,
  }),
  // Himansh — Chandra basin high camp
  himansh: svg({
    seed: 55,
    sky: ["#2f3f6b", "#e7a987"],
    layers: [
      { base: 520, amp: 120, color: "#5a5f86", peaks: [{ x: 0.3, h: 260, w: 0.06 }, { x: 0.72, h: 200, w: 0.07 }], snow: { depth: 110, color: "#f3e7e7" } },
      { base: 660, amp: 140, color: "#3a3d5c", peaks: [{ x: 0.55, h: 120, w: 0.08 }], snow: { depth: 40, color: "#d9cfd6", opacity: 0.7 } },
      { base: 800, amp: 60, color: "#26283d", after: station(1050, 790, 1.1, "#15161f", "tents") },
    ],
    starsN: 60,
  }),
  // Chandra / Sutri Dhaka glacier
  glacier: svg({
    seed: 66,
    sky: ["#8db4d6", "#eef3f7"],
    layers: [
      { base: 460, amp: 120, color: "#7a8196", peaks: [{ x: 0.2, h: 220, w: 0.05 }, { x: 0.8, h: 240, w: 0.06 }], snow: { depth: 120, color: "#fbfcfd" } },
      { base: 640, amp: 50, rough: 0.4, color: "#dbe7f0" },
      { base: 760, amp: 80, color: "#6d6660", snow: { depth: 10, color: "#e5e1dd", opacity: 0.5 } },
    ],
  }),
  // Night aurora over ice
  aurora: svg({
    seed: 77,
    sky: ["#060b1f", "#1a2c4a"],
    starsN: 260,
    auroraColors: ["#57f2b5", "#3fc4c9", "#8a6cf0"],
    layers: [
      { base: 720, amp: 60, color: "#0f1a2c", snow: { depth: 18, color: "#40597a", opacity: 0.6 } },
      { base: 840, amp: 20, color: "#18263b" },
    ],
  }),
  // Research vessel in pack ice
  voyage: svg({
    seed: 88,
    sky: ["#6f8fae", "#dfe7ee"],
    sun: { x: 400, y: 220, r: 26, color: "#fff" },
    layers: [{ base: 560, amp: 40, color: "#a9bccb" }],
    sea: { y: 600, color: ["#355572", "#1a2e44"] },
    floeColor: "#f2f6f9",
    floeN: 90,
    extras: ship(900, 640, 1.4, "#b13b2e"),
  }),
  // Ice-core cross section
  icecore: svg({
    seed: 99,
    sky: ["#dfeef7", "#b9d5e6"],
    stripes: ["#eaf4fa", "#cfe2ee", "#a9c8dc", "#f6fbfe", "#8fb3cc"],
  }),
  // Southern Ocean swell
  ocean: svg({
    seed: 111,
    sky: ["#51708f", "#b7c9d8"],
    layers: [],
    sea: { y: 520, color: ["#27455f", "#0f2133"] },
    floeColor: "#e8eef3",
    floeN: 12,
  }),
  // Field camp on the plateau
  camp: svg({
    seed: 122,
    sky: ["#f0c9a2", "#f7ede3"],
    sun: { x: 1300, y: 520, r: 30, color: "#ffe2bd" },
    layers: [
      { base: 560, amp: 40, color: "#e7d9cf" },
      { base: 700, amp: 20, color: "#f7f1ec", after: station(420, 700, 1.3, "#6b3a2e", "tents") },
    ],
  }),
  // Blue ice / crevasse abstract
  blueice: svg({
    seed: 133,
    sky: ["#bfe0f0", "#f4fafd"],
    layers: [
      { base: 380, amp: 260, rough: 0.7, color: "#9fcbe3" },
      { base: 540, amp: 240, rough: 0.7, color: "#6fa9cc" },
      { base: 720, amp: 200, rough: 0.7, color: "#3f7fa8" },
      { base: 880, amp: 120, rough: 0.7, color: "#1f567d" },
    ],
  }),
};

for (const [name, content] of Object.entries(plates)) {
  writeFileSync(`${OUT}/${name}.svg`, content);
}
console.log(`Wrote ${Object.keys(plates).length} plates to ${OUT}`);
