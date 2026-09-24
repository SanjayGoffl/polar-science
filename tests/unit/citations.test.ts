import { describe, expect, it } from "vitest";
import { normaliseHashtags, resolveCitations, UngroundedOutputError } from "@/lib/ai/validate";

const sections = [
  { id: "s1", number: "1", heading: "Intro", body: "…" },
  { id: "s2", number: "2", heading: "Sea ice", body: "…" },
  { id: "s3", number: "3", heading: "Ice cores", body: "…" },
];

describe("resolveCitations", () => {
  it("maps claimed section numbers to real sections, in order, without duplicates", () => {
    expect(resolveCitations(["3", "§2", "section 3"], sections).map((s) => s.id)).toEqual(["s2", "s3"]);
  });

  it("drops sections that are not in the source", () => {
    expect(resolveCitations(["2", "9"], sections).map((s) => s.id)).toEqual(["s2"]);
  });

  it("rejects output that cites nothing real", () => {
    expect(() => resolveCitations([], sections)).toThrow(UngroundedOutputError);
    expect(() => resolveCitations(["7", "8"], sections)).toThrow(UngroundedOutputError);
  });
});

describe("normaliseHashtags", () => {
  it("adds #, strips spaces and punctuation, dedupes and caps at 4", () => {
    expect(normaliseHashtags(["Antarctica", "#NCPOR", "#NCPOR", "polar science!", "#a", "#b"])).toEqual([
      "#Antarctica",
      "#NCPOR",
      "#polarscience",
      "#a",
    ]);
  });
});
