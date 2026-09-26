import { expect, test } from "@playwright/test";

test("first-time visitors get a short tour that can be skipped and reopened", async ({ page }) => {
  await page.goto("/");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Find research by place and year" })).toBeVisible();
  await dialog.getByRole("button", { name: "Next", exact: true }).click();
  await expect(dialog.getByRole("heading", { name: "Read the stories" })).toBeVisible();
  await dialog.getByRole("button", { name: "Skip", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Returning visitors are not shown it again...
  await page.reload();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  // ...but can reopen it from the footer.
  await page.getByRole("button", { name: "Show the welcome tour" }).click();
  await expect(dialog).toBeVisible();
});
