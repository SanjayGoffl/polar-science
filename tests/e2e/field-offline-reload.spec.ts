import { expect, test } from "./fixtures";

// Needs the service worker, which is only registered in production builds.
test.skip(process.env.E2E_PROD !== "1", "run with `npm run test:e2e:prod`");

test("field app opens with no network after a reload, and entries sync once back online", async ({ page, context }) => {
  await page.goto("/field");
  await expect(page.getByText("this page opens without a network")).toBeVisible({ timeout: 20_000 });
  // Give the worker a moment to finish caching the page's assets.
  await page.waitForTimeout(1500);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "New field entry" })).toBeVisible();
  await expect(page.getByTestId("net-status")).toHaveText(/Offline/);

  const note = `Prod offline reload ${Date.now()}`;
  await page.getByLabel("Your name").fill("E2E Prod");
  await page.getByLabel("Notes").fill(note);
  await page.getByRole("button", { name: /Save to device/ }).click();
  const row = page.getByTestId("entry-list").locator("li", { hasText: note });
  await expect(row).toHaveAttribute("data-status", "queued");

  await context.setOffline(false);
  await expect(row).toHaveAttribute("data-status", "synced", { timeout: 15_000 });
});
