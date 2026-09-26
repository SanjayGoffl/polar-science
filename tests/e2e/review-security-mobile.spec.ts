import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

async function signIn(page: Page) {
  await page.goto("/admin");
  await page.getByLabel("Passcode").fill("ncpor2026");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Review queue" })).toBeVisible();
}

const uuid = () => crypto.randomUUID();

test("uploads: type is sniffed, and pending photos stay private until approved", async ({ page, request }) => {
  const base = { station: "maitri", activity: "Other", notes: "Upload privacy check", submittedBy: "E2E", capturedAt: new Date().toISOString() };

  // A script disguised as an image is refused.
  const bad = await request.post("/api/field-entries", {
    multipart: { ...base, id: uuid(), photo: { name: "x.png", mimeType: "image/png", buffer: Buffer.from("<svg onload=alert(1)>") } },
  });
  expect(bad.status()).toBe(400);

  const id = uuid();
  const ok = await request.post("/api/field-entries", {
    multipart: { ...base, id, notes: `Private photo ${id}`, photo: { name: "p.png", mimeType: "image/png", buffer: PNG_1PX } },
  });
  expect(ok.status()).toBe(201);
  const photoUrl = (await ok.json()).entry.photoUrl as string;
  expect(photoUrl).toMatch(/\.png$/);

  // Not approved yet: hidden from the public.
  expect((await request.get(photoUrl)).status()).toBe(404);

  // Reviewers can see it and approve it; then it is public.
  await signIn(page);
  expect((await page.request.get(photoUrl)).status()).toBe(200);
  const res = await page.request.patch("/api/admin/review", { data: { kind: "field", id, status: "approved" } });
  expect(res.ok()).toBe(true);
  expect((await request.get(photoUrl)).status()).toBe(200);
});

test("review API rejects anonymous callers, and regenerate is reviewer-only", async ({ request }) => {
  expect((await request.patch("/api/admin/review", { data: { kind: "field", id: "x", status: "approved" } })).status()).toBe(401);
  const r = await request.post("/api/ai/generate", { data: { reportId: "nope", kind: "caption", audience: "social" } });
  expect(r.status()).toBe(404);
});

test("a reviewer can correct AI wording; the approved version is what the public sees", async ({ page }) => {
  await page.goto("/reports/first-scientific-expedition-to-arctic-pib-r70423");
  const reportId = await page.evaluate(async () => {
    // The page doesn't expose ids, so resolve via the generate endpoint using the slug's report id from the DOM data.
    return document.querySelector<HTMLElement>("[data-report-id]")?.dataset.reportId ?? "";
  });
  expect(reportId).not.toBe("");

  const gen = await page.request.post("/api/ai/generate", { data: { reportId, kind: "explanation", audience: "public" } });
  expect(gen.ok()).toBe(true);
  const { content } = await gen.json();
  expect(content.sources.length).toBeGreaterThan(0);

  // Anonymous regenerate is refused.
  const regen = await page.request.post("/api/ai/generate", { data: { reportId, kind: "explanation", audience: "public", regenerate: true } });
  expect(regen.status()).toBe(403);

  await signIn(page);
  const note = `Reviewer note: wording checked ${Date.now()}.`;
  const edited = `${content.text.replace(/\n\nReviewer note:[^\n]*$/, "")}\n\n${note}`;
  const patch = await page.request.patch("/api/admin/review", { data: { kind: "ai", id: content.id, status: "approved", text: edited } });
  expect(patch.ok()).toBe(true);

  await page.goto("/reports/first-scientific-expedition-to-arctic-pib-r70423?explain=public");
  const panel = page.getByRole("complementary", { name: /AI explanation/ });
  await expect(panel.getByText("Reviewed by NCPOR")).toBeVisible({ timeout: 20_000 });
  await expect(panel.getByText(/edited by reviewer/)).toBeVisible();
  await expect(panel.getByText(note)).toBeVisible();
  // Signed-in reviewers get the regenerate control.
  await expect(panel.getByRole("button", { name: "Regenerate" })).toBeVisible();
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("story chapter rail sits below the header and stays usable", async ({ page }) => {
    await page.goto("/expeditions/isea-40/story");
    await page.getByRole("link", { name: /Begin/ }).click();
    const rail = page.getByRole("navigation", { name: "Chapters" });
    await expect(rail).toBeVisible();
    const header = await page.locator("header").first().boundingBox();
    const box = await rail.boundingBox();
    expect(box!.y).toBeGreaterThanOrEqual(header!.y + header!.height - 2);
    // No horizontal page overflow.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("field app works offline on a phone-sized screen", async ({ page, context }) => {
    await page.goto("/field");
    await context.setOffline(true);
    const note = `Mobile offline ${Date.now()}`;
    await page.getByLabel("Your name").fill("Mobile Tester");
    await page.getByLabel("Notes").fill(note);
    await page.getByRole("button", { name: /Save to device/ }).click();
    const row = page.getByTestId("entry-list").locator("li", { hasText: note });
    await expect(row).toHaveAttribute("data-status", "queued");
    await context.setOffline(false);
    await expect(row).toHaveAttribute("data-status", "synced", { timeout: 15_000 });
  });

  test("key pages have no horizontal overflow", async ({ page }) => {
    for (const url of ["/", "/explore", "/stories", "/reports/india-marks-four-successful-decades-of-scientific-endeavourin-antarcti-pib-1712402", "/expeditions/isea-40/story", "/stories", "/stations/bharati", "/search?q=ice", "/admin"]) {
      await page.goto(url);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, url).toBeLessThanOrEqual(1);
    }
  });
});
