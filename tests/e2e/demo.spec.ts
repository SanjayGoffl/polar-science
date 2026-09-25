import { expect, test } from "@playwright/test";

// The judging demo script, end to end: map → station → timeline → story → report →
// explain (student/public) → caption → offline field entry → admin approval → public.
test("full demo path", async ({ page, context }) => {
  // Home → Explore map
  await page.goto("/");
  await page.getByRole("link", { name: "Explore the map" }).click();
  await expect(page).toHaveURL(/\/explore/);

  // Pick Bharati: its expeditions light up; open ISEA-43 from the panel
  // Click the real map pin once the opening camera animation has finished.
  const pin = page.locator('.leaflet-marker-icon[title="Bharati"]');
  await expect(pin).toBeVisible();
  await page.waitForTimeout(1500);
  await pin.click();
  await expect(page.getByRole("heading", { name: "Bharati", level: 2 })).toBeVisible();
  await page.getByRole("button", { name: /ISEA-43/ }).first().click();
  await expect(page.getByRole("option", { name: /2023.*ISEA-43/ })).toHaveAttribute("aria-selected", "true");

  // Open the story
  await page.getByRole("link", { name: "Read the story →" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("43rd Indian Scientific Expedition");
  await expect(page.getByRole("navigation", { name: "Chapters" }).getByRole("link")).toHaveCount(8);

  // Jump to publications and explain the expedition report simply
  await page.getByRole("navigation", { name: "Chapters" }).getByRole("link", { name: /Papers/ }).click();
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
  await expect(panel.getByText(/Source: ISEA-43/).first()).toBeVisible();

  // Field app: offline entry, then reconnect and sync
  await page.goto("/field");
  await context.setOffline(true);
  const note = `Demo note ${Date.now()}: adelie penguins near the jetty`;
  await page.getByLabel("Your name").fill("Demo Scientist");
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
