import type { Metadata } from "next";
import { cookies } from "next/headers";
import { LoginForm } from "@/components/admin/LoginForm";
import { ReviewQueue, type ReviewItem } from "@/components/admin/ReviewQueue";
import { ADMIN_COOKIE, adminToken } from "@/lib/admin";
import { db } from "@/lib/db";
import { logout } from "./actions";

export const metadata: Metadata = { title: "Review", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const authed = (await cookies()).get(ADMIN_COOKIE)?.value === adminToken();
  if (!authed) return <LoginForm />;

  const [fieldEntries, aiItems] = await Promise.all([
    db.fieldEntry.findMany({ orderBy: { syncedAt: "desc" }, include: { station: true }, take: 100 }),
    db.aIContent.findMany({
      orderBy: { generatedAt: "desc" },
      include: { sourceReport: { select: { slug: true, title: true } }, sources: { include: { section: { select: { number: true, heading: true } } } } },
      take: 100,
    }),
  ]);

  const items: ReviewItem[] = [
    ...fieldEntries.map((f) => ({
      kind: "field" as const,
      id: f.id,
      status: f.reviewStatus,
      at: f.syncedAt.toISOString(),
      title: `${f.activity} · ${f.station.name}`,
      body: f.notes,
      meta: `Field entry by ${f.submittedBy} · logged ${f.capturedAt.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`,
      photoUrl: f.photoUrl,
      source: null,
    })),
    ...aiItems.map((a) => ({
      kind: "ai" as const,
      id: a.id,
      status: a.reviewStatus,
      at: a.generatedAt.toISOString(),
      title: a.kind === "caption" ? "Social caption" : `Plain-language explanation · ${a.audience === "student" ? "students" : "general public"}`,
      body: a.text,
      meta: `${a.provider === "claude" ? `Claude (${a.model})` : "Offline summariser"}`,
      photoUrl: null,
      source: a.sourceReport
        ? {
            href: `/reports/${a.sourceReport.slug}#section-${a.sources[0]?.section.number ?? 1}`,
            label: `${a.sourceReport.title} · ${a.sources.map((s) => `§${s.section.number}`).join(", ")}`,
          }
        : null,
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <p className="eyebrow">NCPOR outreach desk</p>
          <h1 className="font-serif text-4xl tracking-tight">Review queue</h1>
          <p className="text-ink-2 mt-2 max-w-2xl">
            Field entries and AI-generated text appear on the public site only after someone approves them here.
          </p>
        </div>
        <form action={logout}>
          <button className="btn btn-ghost !py-1.5 !text-xs">Sign out</button>
        </form>
      </div>
      <ReviewQueue items={items} />
    </div>
  );
}
