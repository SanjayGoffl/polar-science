import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES, UPLOAD_DIR } from "@/lib/uploads";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
 * duplicate syncs of the same entry upsert the same row instead of duplicating it.
 */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });

  const id = String(form.get("id") ?? "");
  const stationSlug = String(form.get("station") ?? "");
  const activity = String(form.get("activity") ?? "").trim();
  const notes = String(form.get("notes") ?? "").trim();
  const submittedBy = String(form.get("submittedBy") ?? "").trim();
  const capturedAt = new Date(String(form.get("capturedAt") ?? ""));
  const photo = form.get("photo");

  if (!UUID.test(id)) return NextResponse.json({ error: "Invalid entry id" }, { status: 400 });
  if (!activity || !notes || !submittedBy || Number.isNaN(capturedAt.getTime())) {
    return NextResponse.json({ error: "activity, notes, submittedBy and capturedAt are required" }, { status: 400 });
  }
  const station = await db.station.findUnique({ where: { slug: stationSlug } });
  if (!station) return NextResponse.json({ error: "Unknown station" }, { status: 400 });

  const existing = await db.fieldEntry.findUnique({ where: { id } });
  if (existing) return NextResponse.json({ entry: existing, duplicate: true });

  let photoUrl: string | null = null;
  if (photo instanceof File && photo.size > 0) {
    const ext = ALLOWED_IMAGE_TYPES[photo.type];
    if (!ext) return NextResponse.json({ error: "Photo must be JPEG, PNG or WebP" }, { status: 400 });
    if (photo.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "Photo too large" }, { status: 413 });
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, `${id}.${ext}`), Buffer.from(await photo.arrayBuffer()));
    photoUrl = `/api/uploads/${id}.${ext}`;
  }

  const entry = await db.fieldEntry.upsert({
    where: { id },
    update: {},
    create: {
      id, stationId: station.id, activity: activity.slice(0, 120), notes: notes.slice(0, 4000),
      submittedBy: submittedBy.slice(0, 120), capturedAt, photoUrl,
    },
  });
  return NextResponse.json({ entry, duplicate: false }, { status: 201 });
}
