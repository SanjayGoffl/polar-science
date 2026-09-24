import Database from "better-sqlite3";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

// Apply the real migrations to an in-memory database and exercise the constraints directly.
let db: Database.Database;

beforeAll(() => {
  db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  const dir = path.resolve("prisma/migrations");
  for (const m of readdirSync(dir).filter((d) => !d.endsWith(".toml")).sort()) {
    db.exec(readFileSync(path.join(dir, m, "migration.sql"), "utf8"));
  }
  db.exec(`
    INSERT INTO Station (id, slug, name, region, kind, lat, lng, location, description, heroImage) VALUES ('st','bharati','Bharati','antarctica','station',-69,76,'x','x','x');
    INSERT INTO Expedition (id, slug, name, shortName, year, season, region, stationId, lat, lng, summary, heroImage) VALUES ('ex','e','E','E',2023,'s','antarctica','st',0,0,'x','x');
    INSERT INTO Report (id, slug, expeditionId, title, type, authors, publishedOn, abstract) VALUES ('rp','r','ex','R','expedition-report','a',0,'x');
    INSERT INTO FieldEntry (id, stationId, activity, notes, submittedBy, capturedAt) VALUES ('fe','st','a','n','s',0);
  `);
});

const insert = (report: string | null, field: string | null, kind = "explanation") =>
  db
    .prepare(
      `INSERT INTO AIContent (id, kind, audience, text, provider, model, sourceReportId, sourceFieldEntryId) VALUES (?, ?, 'student', 't', 'mock', 'm', ?, ?)`,
    )
    .run(Math.random().toString(36), kind, report, field);

describe("AIContent provenance constraint", () => {
  it("accepts content linked to exactly one source", () => {
    expect(() => insert("rp", null)).not.toThrow();
    expect(() => insert(null, "fe")).not.toThrow();
  });

  it("rejects AI content with no source", () => {
    expect(() => insert(null, null)).toThrow(/CHECK constraint failed/);
  });

  it("rejects AI content claiming two sources", () => {
    expect(() => insert("rp", "fe")).toThrow(/CHECK constraint failed/);
  });

  it("rejects a source that does not exist (foreign key)", () => {
    expect(() => insert("no-such-report", null)).toThrow(/FOREIGN KEY/);
  });

  it("rejects unknown content kinds", () => {
    expect(() => insert("rp", null, "poem")).toThrow(/CHECK constraint failed/);
  });
});
