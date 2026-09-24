import { fieldDb, type LocalEntry } from "./db";

export interface SyncReport {
  attempted: number;
  synced: number;
  failed: number;
  offline: boolean;
}

let running: Promise<SyncReport> | null = null;

/** Errors worth retrying later (network trouble or server hiccups) versus permanent rejections. */
function isRetryable(status: number) {
  return status === 408 || status === 429 || status >= 500;
}

async function upload(entry: LocalEntry, fetchImpl: typeof fetch): Promise<Response> {
  const form = new FormData();
  form.set("id", entry.id);
  form.set("station", entry.station);
  form.set("activity", entry.activity);
  form.set("notes", entry.notes);
  form.set("submittedBy", entry.submittedBy);
  form.set("capturedAt", entry.capturedAt);
  if (entry.photo) {
    const ext = entry.photoType === "image/png" ? "png" : entry.photoType === "image/webp" ? "webp" : "jpg";
    form.set("photo", new File([entry.photo], `${entry.id}.${ext}`, { type: entry.photoType ?? "image/jpeg" }));
  }
  return fetchImpl("/api/field-entries", { method: "POST", body: form });
}

/**
 * Upload every queued/failed-but-retryable entry, oldest first.
 * Only one sync runs at a time; concurrent callers share the in-flight run.
 * A network error stops the run (we're offline) and leaves entries queued.
 */
export function syncAll(opts: { fetchImpl?: typeof fetch; isOnline?: () => boolean } = {}): Promise<SyncReport> {
  if (running) return running;
  const fetchImpl = opts.fetchImpl ?? fetch.bind(globalThis);
  const isOnline = opts.isOnline ?? (() => typeof navigator === "undefined" || navigator.onLine);

  running = (async () => {
    const report: SyncReport = { attempted: 0, synced: 0, failed: 0, offline: false };
    if (!isOnline()) return { ...report, offline: true };

    // Recover entries left "syncing" by a tab that closed mid-upload.
    await fieldDb.entries.where("status").equals("syncing").modify({ status: "queued" });

    const pending = await fieldDb.entries
      .where("status")
      .anyOf("queued", "failed")
      .filter((e) => e.status === "queued" || !e.lastError?.startsWith("Rejected"))
      .sortBy("createdAt");

    for (const entry of pending) {
      if (!isOnline()) {
        report.offline = true;
        break;
      }
      report.attempted++;
      await fieldDb.entries.update(entry.id, { status: "syncing", attempts: entry.attempts + 1 });
      try {
        const res = await upload(entry, fetchImpl);
        if (res.ok) {
          const body = await res.json().catch(() => ({}));
          await fieldDb.entries.update(entry.id, {
            status: "synced",
            syncedAt: new Date().toISOString(),
            reviewStatus: body?.entry?.reviewStatus ?? "pending",
            lastError: undefined,
            // The server has the photo now; keep a small local copy for the list thumbnail.
          });
          report.synced++;
        } else {
          const body = await res.json().catch(() => ({}));
          const msg = body?.error ?? `HTTP ${res.status}`;
          await fieldDb.entries.update(entry.id, {
            status: "failed",
            lastError: isRetryable(res.status) ? `Server busy: ${msg}` : `Rejected: ${msg}`,
          });
          report.failed++;
        }
      } catch {
        // fetch() threw: no connection. Put it back and stop trying for now.
        await fieldDb.entries.update(entry.id, { status: "queued", lastError: "No connection" });
        report.offline = true;
        break;
      }
    }
    return report;
  })().finally(() => {
    running = null;
  });

  return running;
}

/** Refresh the review status of already-synced entries (approved / rejected by NCPOR). */
export async function refreshReviewStatus(fetchImpl: typeof fetch = fetch.bind(globalThis)) {
  const synced = await fieldDb.entries.where("status").equals("synced").toArray();
  const ids = synced.filter((e) => e.reviewStatus !== "approved" && e.reviewStatus !== "rejected").map((e) => e.id);
  if (!ids.length) return;
  const res = await fetchImpl(`/api/field-entries?ids=${ids.join(",")}`);
  if (!res.ok) return;
  const { entries } = (await res.json()) as { entries: { id: string; reviewStatus: LocalEntry["reviewStatus"] }[] };
  await Promise.all(entries.map((e) => fieldDb.entries.update(e.id, { reviewStatus: e.reviewStatus })));
}
