import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const STATUSES = ["approved", "rejected", "pending"];

/**
 * Approve / reject / reopen a field entry or AI draft. For AI drafts a reviewer may also
 * correct the wording (`text`); citations stay attached, and the edit is recorded.
 */
export async function PATCH(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authorised" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const status = body?.status;
  if (!STATUSES.includes(status) || typeof body?.id !== "string") {
    return NextResponse.json({ error: "Expected { kind, id, status }" }, { status: 400 });
  }
  const data = { reviewStatus: status as string, reviewedAt: status === "pending" ? null : new Date() };

  try {
    if (body.kind === "field") {
      return NextResponse.json({ item: await db.fieldEntry.update({ where: { id: body.id }, data }) });
    }
    if (body.kind === "ai") {
      const text = typeof body.text === "string" ? body.text.trim() : undefined;
      if (text !== undefined && (text.length < 10 || text.length > 6000)) {
        return NextResponse.json({ error: "Edited text must be 10–6000 characters" }, { status: 400 });
      }
      const current = await db.aIContent.findUnique({ where: { id: body.id }, select: { text: true } });
      if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const edited = text !== undefined && text !== current.text;
      const item = await db.aIContent.update({
        where: { id: body.id },
        data: { ...data, ...(edited ? { text, editedByReviewer: true } : {}) },
      });
      return NextResponse.json({ item });
    }
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ error: "kind must be field or ai" }, { status: 400 });
}
