import { readFile } from "node:fs/promises";
import path from "node:path";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { MIME_BY_EXT, UPLOAD_DIR } from "@/lib/uploads";

export const runtime = "nodejs";

/** Field photos are public only once their entry is approved; reviewers can see everything. */
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const m = /^([0-9a-f-]{36})\.(jpg|png|webp)$/i.exec(file);
  if (!m) return new Response("Not found", { status: 404 });

  const entry = await db.fieldEntry.findUnique({ where: { id: m[1] }, select: { reviewStatus: true } });
  if (!entry) return new Response("Not found", { status: 404 });
  const approved = entry.reviewStatus === "approved";
  if (!approved && !(await isAdmin())) return new Response("Not found", { status: 404 });

  try {
    const data = await readFile(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, file));
    return new Response(data, {
      headers: {
        "Content-Type": MIME_BY_EXT[m[2].toLowerCase()],
        "Cache-Control": approved ? "public, max-age=86400" : "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
