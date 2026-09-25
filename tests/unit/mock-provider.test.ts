import { describe, expect, it } from "vitest";
import { createMockProvider } from "@/lib/ai/mock";
import type { SourceDocument } from "@/lib/ai/types";

const doc: SourceDocument = {
  title: "Test Report: Sea Ice at Bharati",
  kind: "expedition-report",
  expedition: "ISEA-43",
  sections: [
    { id: "a", number: "1", heading: "Introduction", body: "The team reached Bharati on 29 November 2023. Work began soon after." },
    { id: "b", number: "2", heading: "Sea-ice thickness results", body: "Mean level-ice thickness was 1.62 ± 0.21 m, approximately 0.18 m thinner than usual. Snow was deep." },
    { id: "c", number: "3", heading: "Data management", body: "Data were archived at NPDC in 2024." },
    { id: "d", number: "4", heading: "Conclusions", body: "Ice was thinner. Continued monitoring is essential." },
  ],
};

describe("mock provider", () => {
  const p = createMockProvider();

  it("cites only sections that exist, including the findings section", async () => {
    const { draft: out } = await p.explain(doc, "student");
    const valid = new Set(doc.sections.map((s) => s.number));
    expect(out.usedSections.length).toBeGreaterThan(0);
    expect(out.usedSections.every((n) => valid.has(n))).toBe(true);
    expect(out.usedSections).toContain("2");
  });

  it("simplifies for students: drops error bars and converts small metres to cm", async () => {
    const text = (await p.explain(doc, "student")).draft.keyPoints.join(" ");
    expect(text).toContain("18 cm");
    expect(text).not.toContain("±");
  });

  it("keeps the original precision for the general public", async () => {
    const { draft: out } = await p.explain(doc, "public");
    expect(out.keyPoints.join(" ")).toContain("1.62 ± 0.21 m");
  });

  it("produces a caption grounded in a real section", async () => {
    const { draft: out } = await p.caption(doc);
    expect(out.caption).toMatch(/ISEA-43/);
    expect(out.usedSections).toEqual(["2"]);
    expect(out.hashtags).toContain("#Antarctica");
  });
});
