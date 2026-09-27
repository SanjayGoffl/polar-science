import { NextResponse } from "next/server";
import { generateForReport, getCachedForReport } from "@/lib/ai";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { clientKey, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

const AUDIENCES = { explanation: ["student", "public"], caption: ["social"] } as const;
const LANGUAGES = ["en", "hi"] as const;
type Language = (typeof LANGUAGES)[number];

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const kind = body?.kind as keyof typeof AUDIENCES;
  const audience = body?.audience;
  const language: Language = LANGUAGES.includes(body?.language) ? body.language : "en";
  if (typeof body?.reportId !== "string" || !(kind in AUDIENCES) || !(AUDIENCES[kind] as readonly string[]).includes(audience)) {
    return NextResponse.json({ error: "Expected { reportId, kind: explanation|caption, audience }" }, { status: 400 });
  }
  if (!(await db.report.findUnique({ where: { id: body.reportId }, select: { id: true } }))) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  // Cache lookups are free: they never call a model.
  if (body.cachedOnly) {
    const content = await getCachedForReport({ reportId: body.reportId, kind, audience, language });
    return NextResponse.json({ content, cached: true, fallbackReason: null, canRegenerate: await isAdmin() });
  }

  // Forcing a fresh generation spends API quota, so only reviewers may do it.
  const admin = await isAdmin();
  const regenerate = !!body.regenerate && admin;
  if (body.regenerate && !admin) return NextResponse.json({ error: "Only reviewers can regenerate" }, { status: 403 });

  const limit = rateLimit(`ai:${clientKey(req)}`, admin ? 100 : 40, 10 * 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many requests. Please wait a few minutes." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  }

  try {
    const result = await generateForReport({ reportId: body.reportId, kind, audience, language, regenerate });
    return NextResponse.json({ ...result, canRegenerate: admin });
  } catch (err) {
    console.error("[ai/generate]", err);
    return NextResponse.json({ error: "Couldn't generate a summary right now. Please try again in a moment." }, { status: 502 });
  }
}
