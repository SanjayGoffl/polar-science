import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clientKey, rateLimit } from "@/lib/rateLimit";
import { MAX_UPLOAD_BYTES, sniffImage, UPLOAD_DIR } from "@/lib/uploads";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clean = (v: FormDataEntryValue | null, max: number) =>
  String(v ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim()
    .slice(0, max);

/** Review status for entries a device has synced: GET /api/field-entries?ids=a,b */
export async function GET(req: Request) {
  const ids = (new URL(req.url).searchParams.get("ids") ?? "").split(",").filter((id) => UUID.test(id)).slice(0, 200);
  if (!ids.length) return NextResponse.json({ entries: [] });
  const entries = await db.fieldEntry.findMany({ where: { id: { in: ids } }, select: { id: true, reviewStatus: true } });
  return NextResponse.json({ entries });
}

/**
 * Idempotent sync endpoint for the offline field app.
 * The client generates the entry's UUID when it's captured, so retries or
 * duplicate syncs of the same entry return the existing row instead of duplicating it.
 */
export async function POST(req: Request) {
  const limit = rateLimit(`field:${clientKey(req)}`, 120, 10 * 60_000);
  if (!limit.ok) return NextResponse.json({ error: "Too many uploads, retry shortly" }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });

  const id = clean(form.get("id"), 36);
  const stationSlug = clean(form.get("station"), 60);
  const activity = clean(form.get("activity"), 120);
  const notes = clean(form.get("notes"), 4000);
  const submittedBy = clean(form.get("submittedBy"), 120);
  const capturedAt = new Date(clean(form.get("capturedAt"), 40));
  const photo = form.get("photo");

  if (!UUID.test(id)) return NextResponse.json({ error: "Invalid entry id" }, { status: 400 });
  if (!activity || notes.length < 3 || !submittedBy || Number.isNaN(capturedAt.getTime())) {
    return NextResponse.json({ error: "activity, notes, submittedBy and capturedAt are required" }, { status: 400 });
  }
  // Reject clocks far in the future (a day of slack for timezone mistakes on field devices).
  if (capturedAt.getTime() > Date.now() + 86_400_000) return NextResponse.json({ error: "capturedAt is in the future" }, { status: 400 });

  const station = await db.station.findUnique({ where: { slug: stationSlug } });
  if (!station) return NextResponse.json({ error: "Unknown station" }, { status: 400 });

  const existing = await db.fieldEntry.findUnique({ where: { id } });
  if (existing) return NextResponse.json({ entry: existing, duplicate: true });

  // Content-level dedupe: the same note from the same person at the same station within
  // a minute (e.g. logged twice on two devices) is treated as one entry.
  const twin = await db.fieldEntry.findFirst({
    where: {
      stationId: station.id,
      submittedBy,
      notes,
      capturedAt: { gte: new Date(capturedAt.getTime() - 60_000), lte: new Date(capturedAt.getTime() + 60_000) },
    },
  });
  if (twin) return NextResponse.json({ entry: twin, duplicate: true });

  let photoUrl: string | null = null;
  if (photo instanceof File && photo.size > 0) {
    if (photo.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "Photo too large (max 8 MB)" }, { status: 413 });
    const bytes = new Uint8Array(await photo.arrayBuffer());
    const ext = sniffImage(bytes);
    if (!ext) return NextResponse.json({ error: "Photo must be a JPEG, PNG or WebP image" }, { status: 400 });
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, `${id}.${ext}`), bytes);
    photoUrl = `/api/uploads/${id}.${ext}`;
  }

  const entry = await db.fieldEntry.upsert({
    where: { id },
    update: {},
    create: { id, stationId: station.id, activity, notes, submittedBy, capturedAt, photoUrl },
  });
  return NextResponse.json({ entry, duplicate: false }, { status: 201 });
}
