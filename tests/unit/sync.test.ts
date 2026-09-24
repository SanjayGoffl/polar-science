import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { enqueue, fieldDb, uuid } from "@/lib/offline/db";
import { syncAll } from "@/lib/offline/sync";

const base = {
  station: "bharati",
  stationName: "Bharati",
  activity: "Sea-ice drilling",
  notes: "1.5 m",
  submittedBy: "T",
  capturedAt: new Date().toISOString(),
};
const ok = () => new Response(JSON.stringify({ entry: { reviewStatus: "pending" } }), { status: 201 });
const bodyOf = (init?: RequestInit) => init!.body as FormData;

beforeEach(async () => {
  await fieldDb.entries.clear();
});

describe("offline queue", () => {
  it("generates RFC 4122 v4 ids", () => {
    expect(uuid()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("does nothing while offline and leaves entries queued", async () => {
    await enqueue(base);
    const fetchImpl = vi.fn();
    const r = await syncAll({ fetchImpl, isOnline: () => false });
    expect(r.offline).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect((await fieldDb.entries.toArray())[0].status).toBe("queued");
  });

  it("uploads queued entries oldest-first and marks them synced", async () => {
    const a = await enqueue({ ...base, notes: "first" });
    await new Promise((r) => setTimeout(r, 2));
    await enqueue({ ...base, notes: "second" });
    const seen: string[] = [];
    const fetchImpl = vi.fn(async (_u: RequestInfo | URL, init?: RequestInit) => {
      seen.push(String(bodyOf(init).get("notes")));
      return ok();
    });
    const r = await syncAll({ fetchImpl: fetchImpl as typeof fetch, isOnline: () => true });
    expect(r).toMatchObject({ attempted: 2, synced: 2, failed: 0 });
    expect(seen).toEqual(["first", "second"]);
    expect(await fieldDb.entries.get(a.id)).toMatchObject({ status: "synced", reviewStatus: "pending" });
  });

  it("sends the device-generated id so the server can de-duplicate", async () => {
    const e = await enqueue(base);
    let sentId = "";
    const fetchImpl = async (_u: RequestInfo | URL, init?: RequestInit) => {
      sentId = String(bodyOf(init).get("id"));
      return ok();
    };
    await syncAll({ fetchImpl: fetchImpl as typeof fetch, isOnline: () => true });
    expect(sentId).toBe(e.id);
  });

  it("stops on a network error and keeps entries queued for later", async () => {
    await enqueue({ ...base, notes: "one" });
    await enqueue({ ...base, notes: "two" });
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    const r = await syncAll({ fetchImpl: fetchImpl as typeof fetch, isOnline: () => true });
    expect(r.offline).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect((await fieldDb.entries.toArray()).every((e) => e.status === "queued")).toBe(true);
  });

  it("marks permanent rejections as failed and does not retry them", async () => {
    await enqueue(base);
    const bad = vi.fn(async () => new Response(JSON.stringify({ error: "Unknown station" }), { status: 400 }));
    await syncAll({ fetchImpl: bad as typeof fetch, isOnline: () => true });
    const [row] = await fieldDb.entries.toArray();
    expect(row.status).toBe("failed");
    expect(row.lastError).toMatch(/Rejected/);
    const again = vi.fn(async () => ok());
    await syncAll({ fetchImpl: again as typeof fetch, isOnline: () => true });
    expect(again).not.toHaveBeenCalled();
  });

  it("retries server errors on the next run", async () => {
    await enqueue(base);
    await syncAll({ fetchImpl: (async () => new Response("{}", { status: 503 })) as typeof fetch, isOnline: () => true });
    expect((await fieldDb.entries.toArray())[0].status).toBe("failed");
    const r = await syncAll({ fetchImpl: (async () => ok()) as typeof fetch, isOnline: () => true });
    expect(r.synced).toBe(1);
  });

  it("shares one in-flight run between concurrent callers", async () => {
    await enqueue(base);
    const fetchImpl = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 20));
      return ok();
    });
    const [r1, r2] = await Promise.all([
      syncAll({ fetchImpl: fetchImpl as typeof fetch, isOnline: () => true }),
      syncAll({ fetchImpl: fetchImpl as typeof fetch, isOnline: () => true }),
    ]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(r1).toBe(r2);
  });
});
