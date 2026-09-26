import { expect, test } from "./fixtures";

// The main public-to-review journey, end to end: map → station → timeline → story → report →
// explain (student/public) → caption → offline field entry → admin approval → public.
test("explore → story → explain → field entry → review → published", async ({ page, context }) => {
  // Home → Explore map
  await page.goto("/");
  await page.getByRole("link", { name: "Explore the map" }).click();
  await expect(page).toHaveURL(/\/explore/);

  // Pick Bharati: its expeditions light up; open ISEA-40 from the panel
  // Click the real map pin once the opening camera animation has finished.
  const pin = page.locator('.leaflet-marker-icon[title="Bharati"]');
  await expect(pin).toBeVisible();
  await page.waitForTimeout(1500);
  await pin.click();
  await expect(page.getByRole("heading", { name: "Bharati", level: 2 })).toBeVisible();
  await page.getByRole("button", { name: /ISEA-40/ }).first().click();
  await expect(page.getByRole("option", { name: /2021.*ISEA-40/ })).toHaveAttribute("aria-selected", "true");

  // Open the story
  await page.getByRole("link", { name: "Read the story →" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("40th Indian Scientific Expedition");
  await expect(page.getByRole("navigation", { name: "Chapters" }).getByRole("link")).toHaveCount(9);

  // Jump to publications and explain the expedition report simply
  await page.getByRole("navigation", { name: "Chapters" }).getByRole("link", { name: /Sources/ }).click();
  await page.getByRole("link", { name: "✦ Explain this simply" }).first().click();
  await expect(page).toHaveURL(/\/reports\/.+explain=student/);
  const panel = page.getByRole("complementary", { name: /AI explanation/ });
  await expect(panel.getByText("Based on")).toBeVisible({ timeout: 30_000 });
  await expect(panel.getByRole("button", { name: /^§\d/ }).first()).toBeVisible();
  await expect(page.getByText("cited").first()).toBeVisible();

  // Toggle audience → a different, also-cited version
  await panel.getByRole("radio", { name: "General public" }).click();
  await expect(panel.getByRole("radio", { name: "General public" })).toHaveAttribute("aria-checked", "true");
  await expect(panel.getByText("Based on")).toBeVisible({ timeout: 30_000 });

  // Social caption
  await panel.getByRole("tab", { name: "Social caption" }).click();
  await expect(panel.getByText("NCPOR Outreach")).toBeVisible({ timeout: 30_000 });
  await expect(panel.getByText(/Source: ISEA-40/).first()).toBeVisible();

  // Field app: offline entry, then reconnect and sync
  await page.goto("/field");
  await context.setOffline(true);
  const note = `Field note ${Date.now()}: adelie penguins near the jetty`;
  await page.getByLabel("Your name").fill("Test Researcher");
  await page.getByLabel("Station / site").selectOption("bharati");
  await page.getByLabel("Activity").selectOption("Wildlife sighting");
  await page.getByLabel("Notes").fill(note);
  await page.getByRole("button", { name: /Save to device/ }).click();
  const row = page.getByTestId("entry-list").locator("li", { hasText: note });
  await expect(row).toHaveAttribute("data-status", "queued");
  await context.setOffline(false);
  await expect(row).toHaveAttribute("data-status", "synced", { timeout: 15_000 });

  // Not public yet
  await page.goto("/stations/bharati");
  await expect(page.getByText(note)).toHaveCount(0);

  // Admin approves it
  await page.goto("/admin");
  await page.getByLabel("Passcode").fill("ncpor2026");
  await page.getByRole("button", { name: "Sign in" }).click();
  const item = page.getByTestId("review-item").filter({ hasText: note });
  await item.getByRole("button", { name: "Approve" }).click();
  await expect(item).toHaveCount(0);

  // Now it's public on the station page
  await page.goto("/stations/bharati");
  await expect(page.getByText(note)).toBeVisible();
});
