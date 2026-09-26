import { test as base } from "@playwright/test";

/** Every flow test starts as a returning visitor, so the first-visit tour doesn't cover the page. */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("polarstories.tour.v1", "done");
      } catch {}
    });
    await use(page);
  },
});

export { expect } from "@playwright/test";
