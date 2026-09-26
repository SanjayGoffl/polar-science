import Database from "better-sqlite3";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

// Apply the real migrations to an in-memory database and exercise the integrity triggers directly.
let db: Database.Database;

beforeAll(() => {
  db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  const dir = path.resolve("prisma/migrations");
  for (const m of readdirSync(dir).filter((d) => !d.endsWith(".toml")).sort()) {
    db.exec(readFileSync(path.join(dir, m, "migration.sql"), "utf8"));
  }
  db.exec(`
    INSERT INTO Station (id, slug, name, region, kind, lat, lng, location, description, sourceUrl) VALUES ('st','bharati','Bharati','antarctica','station',-69,76,'x','x','https://x');
    INSERT INTO Expedition (id, slug, name, shortName, year, region, stationId, summary, sourceUrl) VALUES ('ex','e','E','E',2021,'antarctica','st','x','https://x');
    INSERT INTO Report (id, slug, expeditionId, title, type, publisher, publishedOn, abstract, externalUrl, sourceSystem, sourceId, contentHash, retrievedAt)
      VALUES ('rp','r','ex','R','press-release','PIB',0,'x','https://pib.gov.in/x','pib','1','h',0);
    INSERT INTO FieldEntry (id, stationId, activity, notes, submittedBy, capturedAt) VALUES ('fe','st','a','n','s',0);
  `);
});

const insertAI = (report: string | null, field: string | null, kind = "explanation", provider = "offline") =>
  db
    .prepare(
      `INSERT INTO AIContent (id, kind, audience, text, provider, model, sourceHash, promptVersion, sourceReportId, sourceFieldEntryId) VALUES (?, ?, 'student', 't', ?, 'm', 'h', '2', ?, ?)`,
    )
    .run(Math.random().toString(36), kind, provider, report, field);

describe("AI provenance", () => {
  it("accepts content linked to exactly one source", () => {
    expect(() => insertAI("rp", null)).not.toThrow();
    expect(() => insertAI(null, "fe")).not.toThrow();
  });

  it("rejects AI content with no source, or with two", () => {
    expect(() => insertAI(null, null)).toThrow(/exactly one source/);
    expect(() => insertAI("rp", "fe")).toThrow(/exactly one source/);
  });

  it("rejects a source that does not exist (foreign key)", () => {
    expect(() => insertAI("no-such-report", null)).toThrow(/FOREIGN KEY/);
  });

  it("rejects unknown kinds and providers", () => {
    expect(() => insertAI("rp", null, "poem")).toThrow(/invalid/);
    expect(() => insertAI("rp", null, "caption", "mock")).toThrow(/invalid/);
  });

  it("cannot be detached from its source later", () => {
    const id = "ai-fixed";
    db.prepare(`INSERT INTO AIContent (id, kind, audience, text, provider, model, sourceHash, promptVersion, sourceReportId) VALUES (?, 'caption', 'social', 't', 'offline', 'm', 'h', '2', 'rp')`).run(id);
    expect(() => db.prepare(`UPDATE AIContent SET sourceReportId = NULL WHERE id = ?`).run(id)).toThrow(/exactly one source/);
  });
});

describe("document and review rules", () => {
  const report = (status: string, url: string) =>
    db
      .prepare(
        `INSERT INTO Report (id, slug, expeditionId, title, type, publisher, publishedOn, abstract, externalUrl, contentStatus, sourceSystem, sourceId, contentHash, retrievedAt) VALUES (?, ?, 'ex', 'R', 'press-release', 'PIB', 0, 'x', ?, ?, 'pib', ?, 'h', 0)`,
      )
      .run(Math.random().toString(36), Math.random().toString(36), url, status, Math.random().toString(36));

  it("requires an http(s) source URL and a known status", () => {
    expect(() => report("official", "https://pib.gov.in/y")).not.toThrow();
    expect(() => report("official", "")).toThrow(/source URL/);
    expect(() => report("sample", "https://x")).toThrow(/contentStatus/);
  });

  it("does not allow the same source record twice", () => {
    expect(() =>
      db
        .prepare(
          `INSERT INTO Report (id, slug, expeditionId, title, type, publisher, publishedOn, abstract, externalUrl, sourceSystem, sourceId, contentHash, retrievedAt) VALUES ('dup','dup','ex','R','press-release','PIB',0,'x','https://pib.gov.in/x','pib','1','h',0)`,
        )
        .run(),
    ).toThrow(/UNIQUE/);
  });

  it("rejects invalid field-entry review statuses", () => {
    expect(() => db.prepare(`UPDATE FieldEntry SET reviewStatus = 'published' WHERE id = 'fe'`).run()).toThrow(/reviewStatus invalid/);
  });

  it("requires attribution on media", () => {
    const media = (author: string, license: string) =>
      db
        .prepare(`INSERT INTO Media (id, kind, title, caption, altText, url, author, license, sourceUrl) VALUES (?, 'photo', 't', 'c', 'a', '/x.jpg', ?, ?, ?)`)
        .run(Math.random().toString(36), author, license, `https://commons.wikimedia.org/${Math.random()}`);
    expect(() => media("Pavan Nair", "CC BY-SA 4.0")).not.toThrow();
    expect(() => media("", "CC BY-SA 4.0")).toThrow(/author and a license/);
  });
});
