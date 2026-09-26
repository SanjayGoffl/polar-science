import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseLiveReadings } from "@/lib/liveWeather";
import { loadEditorial } from "@/lib/sources/editorial";
import { buildSections, headingFor } from "@/lib/sources/sections";
import { loadSnapshots, resolveQuote } from "@/lib/sources/snapshots";

describe("buildSections", () => {
  it("keeps paragraphs verbatim and joins list items to their lead-in", () => {
    const s = buildSections([
      "India launched its first expedition in 2007.",
      "The objectives are:",
      "(i) Study sea ice;",
      "(ii) Study glaciers;",
      "(g) The results indicate the following:",
      "(i) Aerosols correlate with wind speed;",
      "A closing paragraph with enough words.",
    ]);
    expect(s.map((x) => x.number)).toEqual(["1", "2", "3", "4"]);
    expect(s[1].body).toBe("The objectives are:\n(i) Study sea ice;\n(ii) Study glaciers;");
    expect(s[2].body.startsWith("(g) The results")).toBe(true);
  });

  it("derives headings from the section's own first sentence", () => {
    expect(headingFor("Short first sentence. Then more.")).toBe("Short first sentence");
    expect(headingFor("x ".repeat(80)).endsWith("…")).toBe(true);
  });
});

describe("editorial data integrity", () => {
  const docs = loadSnapshots();
  const ed = loadEditorial();

  it("has official snapshots with URLs, hashes and text", () => {
    expect(docs.size).toBeGreaterThan(5);
    for (const [key, d] of docs) {
      expect(d.url, key).toMatch(/^https:\/\//);
      expect(d.contentHash, key).toMatch(/^[0-9a-f]{16}$/);
      expect(d.sections.length, key).toBeGreaterThan(0);
    }
  });

  it("quotes every summary, description and story chapter verbatim from its source", () => {
    for (const s of ed.stations) expect(() => resolveQuote(docs, s.description, s.slug)).not.toThrow();
    for (const e of ed.entries) expect(() => resolveQuote(docs, e.summary, e.slug)).not.toThrow();
    for (const [slug, chapters] of Object.entries(ed.stories))
      for (const c of chapters) if (c.doc) expect(() => resolveQuote(docs, { doc: c.doc!, section: c.section ?? "", quote: c.quote }, slug)).not.toThrow();
  });

  it("rejects a passage that is not in the source", () => {
    expect(() => resolveQuote(docs, { doc: "pib:1712402", section: "1", quote: "India landed on the Moon." }, "test")).toThrow(/not verbatim/);
  });

  it("attaches each document to exactly one entry, and stories only cite attached documents", () => {
    const attached = ed.entries.flatMap((e) => e.documents);
    expect(new Set(attached).size).toBe(attached.length);
    for (const chapters of Object.values(ed.stories)) for (const c of chapters) if (c.doc) expect(attached).toContain(c.doc);
  });

  it("credits and licenses every photo, and the files exist", () => {
    for (const m of ed.media) {
      expect(m.author.trim(), m.id).not.toBe("");
      expect(m.license.trim(), m.id).not.toBe("");
      expect(m.sourceUrl, m.id).toMatch(/^https:\/\/commons\.wikimedia\.org\//);
      if (m.kind === "photo") expect(existsSync(`public${m.url}`), m.url).toBe(true);
    }
    expect(new Set(ed.media.map((m) => m.sourceUrl)).size).toBe(ed.media.length);
  });

  it("links resources only to official hosts", () => {
    for (const r of ed.resources) expect(new URL(r.url).hostname, r.url).toMatch(/(^|\.)ncpor\.res\.in$/);
  });
});

describe("parseLiveReadings", () => {
  it("reads station temperature cards from NCPOR's data portal", () => {
    const html = `<h5><b>Antarctica - Maitri:</b><br>
      <img class="info-bar-icon" src="/static/images/temperature.png">
      <strong>-12.5&deg;
          C</strong></h5><small>24 Sep 2026 11:00 PM</small>
      <h5><b>Arctic - Himadri:</b><br><strong>-0.6&deg; C</strong></h5><small>25 Sep 2026 01:00 AM</small>`;
    expect(parseLiveReadings(html)).toEqual([
      { key: "maitri", label: "Antarctica - Maitri", tempC: -12.5, observed: "24 Sep 2026 11:00 PM", liveUrl: "https://data.ncpor.res.in/maitri/live" },
      { key: "himadri", label: "Arctic - Himadri", tempC: -0.6, observed: "25 Sep 2026 01:00 AM", liveUrl: "https://data.ncpor.res.in/himadri/live" },
    ]);
  });

  it("returns nothing when the layout changes", () => {
    expect(parseLiveReadings("<html>maintenance</html>")).toEqual([]);
  });
});
