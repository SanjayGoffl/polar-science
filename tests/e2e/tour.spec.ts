import { expect, test } from "@playwright/test";

test("first-time visitors get a short tour that can be skipped and reopened", async ({ page }) => {
  await page.goto("/");
  const tour = page.getByRole("dialog", { name: "Find research by place and year" });
  await expect(tour).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("heading", { name: "Read the stories" })).toBeVisible();
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Returning visitors are not shown it again...
  await page.reload();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  // ...but can reopen it from the footer.
  await page.getByRole("button", { name: "Show the welcome tour" }).click();
  await expect(page.getByRole("dialog", { name: "Find research by place and year" })).toBeVisible();
});
