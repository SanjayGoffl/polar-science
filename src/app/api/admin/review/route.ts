import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ADMIN_COOKIE, adminToken } from "@/lib/admin";

export const runtime = "nodejs";

export async function PATCH(req: Request) {
  const jar = await cookies();
  if (jar.get(ADMIN_COOKIE)?.value !== adminToken()) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const status = body?.status;
  if (!["approved", "rejected", "pending"].includes(status) || typeof body?.id !== "string") {
    return NextResponse.json({ error: "Expected { kind, id, status }" }, { status: 400 });
  }
  const data = { reviewStatus: status, reviewedAt: status === "pending" ? null : new Date() };
  if (body.kind === "field") {
    return NextResponse.json({ item: await db.fieldEntry.update({ where: { id: body.id }, data }) });
  }
  if (body.kind === "ai") {
    return NextResponse.json({ item: await db.aIContent.update({ where: { id: body.id }, data }) });
  }
  return NextResponse.json({ error: "kind must be field or ai" }, { status: 400 });
}
