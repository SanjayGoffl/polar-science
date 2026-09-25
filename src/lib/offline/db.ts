import Dexie, { type EntityTable } from "dexie";

export type SyncStatus = "queued" | "syncing" | "synced" | "failed";

/** A field entry as stored on the device, before and after upload. */
export interface LocalEntry {
  id: string; // UUID generated on the device, which makes the upload idempotent
  station: string; // station slug
  stationName: string;
  activity: string;
  notes: string;
  submittedBy: string;
  capturedAt: string; // ISO timestamp from when it was logged in the field
  photo?: Blob; // full (resized) photo; dropped once uploaded to free device storage
  photoType?: string;
  thumb?: Blob; // small preview kept for the list
  status: SyncStatus;
  attempts: number;
  lastError?: string;
  createdAt: number;
  syncedAt?: string;
  reviewStatus?: "pending" | "approved" | "rejected";
}

export const fieldDb = new Dexie("ncpor-field") as Dexie & {
  entries: EntityTable<LocalEntry, "id">;
};

fieldDb.version(1).stores({
  entries: "id, status, createdAt",
});

/** RFC 4122 v4 UUID. Works over plain http on a LAN, where crypto.randomUUID is unavailable. */
export function uuid(): string {
  if (typeof crypto.randomUUID === "function" && globalThis.isSecureContext) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export async function enqueue(entry: Omit<LocalEntry, "id" | "status" | "attempts" | "createdAt">) {
  const row: LocalEntry = { ...entry, id: uuid(), status: "queued", attempts: 0, createdAt: Date.now() };
  await fieldDb.entries.add(row);
  return row;
}
