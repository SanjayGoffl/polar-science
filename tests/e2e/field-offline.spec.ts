import { expect, test } from "./fixtures";

test("field entry logged offline is queued, then syncs automatically on reconnect", async ({ page, context, request }) => {
  await page.goto("/field");
  await expect(page.getByTestId("net-status")).toHaveText(/Online/);

  // Go offline: the browser loses its network entirely.
  await context.setOffline(true);
  await expect(page.getByTestId("net-status")).toHaveText(/Offline/);

  const note = `E2E offline note ${Date.now()}`;
  await page.getByLabel("Your name").fill("E2E Tester");
  await page.getByLabel("Station / site").selectOption("maitri");
  await page.getByLabel("Notes").fill(note);
  await page.getByRole("button", { name: /Save to device/ }).click();

  const row = page.getByTestId("entry-list").locator("li", { hasText: note });
  await expect(row).toHaveAttribute("data-status", "queued");
  await expect(page.getByTestId("queue-count")).toContainText("1");

  // Reconnect: the app notices and syncs by itself, with no click needed.
  await context.setOffline(false);
  await expect(row).toHaveAttribute("data-status", "synced", { timeout: 15_000 });
  await expect(row).toContainText("In NCPOR review");

  // The server has exactly one copy, pending review.
  const id = await page.evaluate(async (n) => {
    const req = indexedDB.open("ncpor-field");
    const db: IDBDatabase = await new Promise((r) => (req.onsuccess = () => r(req.result)));
    const all: { id: string; notes: string }[] = await new Promise((r) => {
      const q = db.transaction("entries").objectStore("entries").getAll();
      q.onsuccess = () => r(q.result);
    });
    return all.find((e) => e.notes === n)!.id;
  }, note);
  const res = await request.get(`/api/field-entries?ids=${id}`);
  expect((await res.json()).entries).toEqual([{ id, reviewStatus: "pending" }]);

  // Idempotency: re-sending the same entry must not create a duplicate.
  const again = await request.post("/api/field-entries", {
    multipart: { id, station: "maitri", activity: "Other", notes: note, submittedBy: "E2E Tester", capturedAt: new Date().toISOString() },
  });
  expect((await again.json()).duplicate).toBe(true);
});
