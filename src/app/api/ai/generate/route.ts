import { NextResponse } from "next/server";
import { generateForReport } from "@/lib/ai";
import { UngroundedOutputError } from "@/lib/ai/validate";

export const runtime = "nodejs";

const AUDIENCES = { explanation: ["student", "public"], caption: ["social"] } as const;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const kind = body?.kind as keyof typeof AUDIENCES;
  const audience = body?.audience;
  if (typeof body?.reportId !== "string" || !(kind in AUDIENCES) || !(AUDIENCES[kind] as readonly string[]).includes(audience)) {
    return NextResponse.json({ error: "Expected { reportId, kind: explanation|caption, audience }" }, { status: 400 });
  }
  try {
    const result = await generateForReport({ reportId: body.reportId, kind, audience, regenerate: !!body.regenerate });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof UngroundedOutputError) {
      return NextResponse.json({ error: "The generated text could not be traced to the source, so it was discarded. Please try again." }, { status: 422 });
    }
    console.error("[ai/generate]", err);
    return NextResponse.json({ error: "Generation failed. Please try again." }, { status: 500 });
  }
}
