// Imports official source documents as verbatim, versioned snapshots.
//
//   node scripts/import-sources.mjs                 refresh everything in data/sources/registry.json
//   node scripts/import-sources.mjs pib:1712402     add/refresh a PIB release by PRID
//   node scripts/import-sources.mjs pib:r151572     older PIB releases use a relid (prefix "r")
//   node scripts/import-sources.mjs ncpor:maitri=https://ncpor.res.in/antarcticas/display/376-maitri-
//   node scripts/import-sources.mjs ncpor-pdf:isea-40-report=https://ncpor.res.in/.../isea-40-report.pdf
//                                                    an NCPOR expedition-report PDF; text is extracted with pdf-parse
//                                                    and split into paragraphs the same way sources:sync sections HTML
//
// Snapshots live in data/sources/<system>/<id>.json with the source URL, retrieval time and a
// content hash. `npm run sources:sync` loads them into the database; it never uses the network.
// A snapshot is only rewritten when the source text actually changed.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { PDFParse } from "pdf-parse";

const ROOT = "data/sources";
const REGISTRY = `${ROOT}/registry.json`;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36";

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", ndash: "–", mdash: "—", deg: "°", plusmn: "±", times: "×", micro: "µ", sup2: "²", frac12: "½", hellip: "…", Aring: "Å", aring: "å", eacute: "é", ouml: "ö", auml: "ä", uuml: "ü", oslash: "ø", Oslash: "Ø" };
const decode = (s) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&([a-z0-9#]+);/gi, (m, e) => ENTITIES[e] ?? ENTITIES[e.toLowerCase()] ?? m);
export const text = (html) =>
  decode(html.replace(/<sup>(.*?)<\/sup>/gi, "$1").replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, ""))
    .replace(/\s+/g, " ")
    .trim();

// Sign-offs ("*****", "RP"), photo captions, social footers and site chrome are not content.
const NOISE = [/^\*+$/, /^pictures?:/i, /^follow us/i, /^photo/i, /recording is available/i, /\[at\]|\[dot\]/, /copyright/i, /last updated/i, /visitors?\b.*\d/i, /all rights reserved/i];
const keepParagraph = (p) => p.split(" ").length >= 6 && !NOISE.some((re) => re.test(p));
const paragraphsOf = (html) => [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => text(m[1])).filter(keepParagraph);

/* ------------------------------ PIB -------------------------------------- */

const pibUrl = (id) =>
  id.startsWith("r") ? `https://pib.gov.in/newsite/PrintRelease.aspx?relid=${id.slice(1)}` : `https://pib.gov.in/PressReleasePage.aspx?PRID=${id}`;

const MONTHS = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };

export function parsePib(html) {
  // Older "relid" pages: plain layout with the ministry and date in a header block.
  if (!html.includes('id="Titleh2"') && html.includes('id="condiv"')) {
    const head = /<div id="thd1"[^>]*>([\s\S]*?)<\/div>/.exec(html)?.[1] ?? "";
    const lines = head.split(/<br\s*\/?>/i).map(text).filter(Boolean);
    const dm = /(\d{1,2})-([A-Za-z]+)-(\d{4})/.exec(head);
    const con = html.slice(html.indexOf('id="condiv"'));
    return {
      title: text(/<div style= ?'text-align:center;font-weight: bold;'>([\s\S]*?)<\/div>/.exec(con)?.[1] ?? ""),
      organisation: (lines.find((l) => /^Ministry/i.test(l)) ?? "").replace(/Science$/, "Sciences"),
      publishedOn: dm ? new Date(`${dm[2]} ${dm[1]}, ${dm[3]} UTC`).toISOString().slice(0, 10) : null,
      paragraphs: paragraphsOf(con),
    };
  }
  const pick = (re) => (re.exec(html)?.[1] ?? "").trim();
  const posted = text(pick(/<div id="PrDateTime"[^>]*>([\s\S]*?)<\/div>/));
  const d = /(\d{1,2}) ([A-Z]{3}) (\d{4})/.exec(posted);
  const start = html.indexOf('id="hydphotoUrl"');
  const end = html.indexOf('id="reel_pic"', start);
  return {
    title: text(pick(/<h2 id="Titleh2">([\s\S]*?)<\/h2>/)),
    organisation: text(pick(/<div id="MinistryName"[^>]*>([\s\S]*?)<\/div>/)),
    publishedOn: d ? new Date(Date.UTC(+d[3], MONTHS[d[2]], +d[1])).toISOString().slice(0, 10) : null,
    paragraphs: start > 0 && end > start ? paragraphsOf(html.slice(start, end)) : [],
  };
}

/* ------------------------------ NCPOR ------------------------------------ */

export function parseNcpor(html) {
  // Page content sits between the page heading (<h2>) and the "Latest News" sidebar.
  const start = html.indexOf("<h2");
  const end = html.indexOf("newsEvent", start);
  const main = start >= 0 ? html.slice(start, end > start ? end : undefined) : html;
  const title = text(/<h2[^>]*>([\s\S]*?)<\/h2>/i.exec(main)?.[1] ?? "") || text(/<title>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "");
  return { title, organisation: "National Centre for Polar and Ocean Research (NCPOR)", publishedOn: null, paragraphs: paragraphsOf(main) };
}

/* ------------------------------ NCPOR expedition-report PDFs ------------- */

// Headers/footers/page numbers repeated on every page are not content.
const PDF_NOISE = [...NOISE, /^page\s+\d+(\s+of\s+\d+)?$/i, /^\d{1,4}$/, /^national centre for polar and ocean research$/i, /^ncpor\b.{0,20}\breport$/i];
const keepPdfParagraph = (p) => p.split(" ").length >= 6 && !PDF_NOISE.some((re) => re.test(p));

/** PDFs hard-wrap lines within a paragraph; blank lines separate paragraphs. */
function paragraphsFromPdfText(raw) {
  const lines = raw.split(/\r?\n/).map((l) => l.trim());
  const blocks = [];
  let current = [];
  for (const line of lines) {
    if (!line) {
      if (current.length) blocks.push(current.join(" "));
      current = [];
      continue;
    }
    if (PDF_NOISE.some((re) => re.test(line))) continue;
    current.push(line);
  }
  if (current.length) blocks.push(current.join(" "));
  return blocks.map((b) => decode(b).replace(/\s+/g, " ").trim()).filter(keepPdfParagraph);
}

const PDF_MONTHS = "(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*";
function pdfDate(info) {
  // pdf.js metadata dates look like "D:20230114120000Z"; fall back to null rather than guess.
  const m = /^D:(\d{4})(\d{2})(\d{2})/.exec(info?.CreationDate ?? "");
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

export async function parseNcporPdf(buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    const info = await parser.getInfo();
    const { text: rawText } = await parser.getText();
    const paragraphs = paragraphsFromPdfText(rawText);
    let title = (info.info?.Title ?? "").trim();
    // Many government PDFs carry no Title metadata; fall back to the report's own opening words.
    if ((!title || /^(microsoft word|untitled)/i.test(title)) && paragraphs.length) {
      const first = paragraphs[0];
      if (first.split(" ").length <= 24) title = paragraphs.shift();
      else {
        // Truncate to the first sentence, or the nearest word boundary under 90 chars.
        const sentence = first.split(/(?<=[.!?])\s/)[0];
        title = sentence.length <= 90 ? sentence : sentence.slice(0, sentence.slice(0, 90).lastIndexOf(" ")) + "…";
      }
    }
    return { title, organisation: "National Centre for Polar and Ocean Research (NCPOR)", publishedOn: pdfDate(info.info), paragraphs };
  } finally {
    await parser.destroy();
  }
}

/* ------------------------------ fetch ------------------------------------ */

/** Government sites drop connections now and then; retry a few times before giving up. */
async function fetchHtml(url) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fetchOnce(url, "text");
    } catch (err) {
      if (attempt >= 4 || /HTTP 4\d\d/.test(err.message)) throw err;
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
}

/** Same retry policy as fetchHtml, for binary PDF downloads. */
async function fetchBinary(url) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fetchOnce(url, "buffer");
    } catch (err) {
      if (attempt >= 4 || /HTTP 4\d\d/.test(err.message)) throw err;
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
}

/** Follows redirects by hand so session cookies set on the way (PIB does this) are kept. */
async function fetchOnce(url, mode) {
  let cookie = "";
  for (let hop = 0; hop < 6; hop++) {
    const res = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "en", Cookie: cookie }, redirect: "manual", signal: AbortSignal.timeout(40_000) });
    const set = res.headers.getSetCookie?.() ?? [];
    if (set.length) cookie = [cookie, ...set.map((c) => c.split(";")[0])].filter(Boolean).join("; ");
    if (res.status >= 300 && res.status < 400) {
      url = new URL(res.headers.get("location"), url).toString();
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return mode === "buffer" ? { buffer: Buffer.from(await res.arrayBuffer()), finalUrl: url } : { html: await res.text(), finalUrl: url };
  }
  throw new Error("too many redirects");
}

const SYSTEMS = {
  pib: { publisher: "Press Information Bureau, Government of India", url: (e) => pibUrl(e.id), parse: parsePib },
  ncpor: { publisher: "National Centre for Polar and Ocean Research", url: (e) => e.url, parse: parseNcpor },
  "ncpor-pdf": { publisher: "National Centre for Polar and Ocean Research", url: (e) => e.url, parse: parseNcporPdf, binary: true },
};

async function importOne(entry) {
  const sys = SYSTEMS[entry.system];
  if (!sys) throw new Error(`unknown system ${entry.system}`);
  const url = sys.url(entry);
  const fetched = sys.binary ? await fetchBinary(url) : await fetchHtml(url);
  const parsed = await sys.parse(sys.binary ? fetched.buffer : fetched.html);
  if (!parsed.title || parsed.paragraphs.length === 0) throw new Error("could not parse document");
  const contentHash = createHash("sha256").update(parsed.title + "\n" + parsed.paragraphs.join("\n")).digest("hex").slice(0, 16);
  mkdirSync(`${ROOT}/${entry.system}`, { recursive: true });
  const file = `${ROOT}/${entry.system}/${entry.id}.json`;
  const prev = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
  if (prev?.contentHash === contentHash) return "unchanged";
  const snapshot = { sourceSystem: entry.system, sourceId: entry.id, url, fetchedFrom: fetched.finalUrl, retrievedAt: new Date().toISOString(), contentHash, publisher: sys.publisher, ...parsed };
  writeFileSync(file, JSON.stringify(snapshot, null, 2) + "\n");
  return prev ? "updated" : "added";
}

function parseArg(arg) {
  const m = /^(pib|ncpor|ncpor-pdf):([a-z0-9-]+)(?:=(https?:\/\/\S+))?$/i.exec(arg);
  if (!m) throw new Error(`bad argument ${arg}`);
  return { system: m[1], id: m[2], ...(m[3] ? { url: m[3] } : {}) };
}

if (process.argv[1]?.endsWith("import-sources.mjs")) {
  const registry = existsSync(REGISTRY) ? JSON.parse(readFileSync(REGISTRY, "utf8")) : [];
  const args = process.argv
    .slice(2)
    .map(parseArg)
    .map((a) => ({ ...registry.find((r) => r.system === a.system && r.id === a.id), ...a }));
  const todo = args.length ? args : registry;
  let failed = false;
  for (const e of todo) {
    try {
      console.log(`${e.system}:${e.id}\t${await importOne(e)}`);
      const i = registry.findIndex((r) => r.system === e.system && r.id === e.id);
      if (i < 0) registry.push(e);
      else registry[i] = { ...registry[i], ...e };
    } catch (err) {
      failed = true;
      console.log(`${e.system}:${e.id}\terror\t${err.message}`);
    }
  }
  registry.sort((a, b) => `${a.system}:${a.id}`.localeCompare(`${b.system}:${b.id}`));
  writeFileSync(REGISTRY, JSON.stringify(registry, null, 2) + "\n");
  if (failed) process.exitCode = 1;
}
