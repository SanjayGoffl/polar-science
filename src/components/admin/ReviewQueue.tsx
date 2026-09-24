"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export interface ReviewItem {
  kind: "field" | "ai";
  id: string;
  status: string;
  at: string;
  title: string;
  body: string;
  meta: string;
  photoUrl: string | null;
  source: { href: string; label: string } | null;
}

type Filter = "pending" | "approved" | "rejected";

export function ReviewQueue({ items }: { items: ReviewItem[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("pending");
  const [local, setLocal] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const statusOf = (i: ReviewItem) => local[i.id] ?? i.status;
  const shown = items.filter((i) => statusOf(i) === filter);
  const count = (f: Filter) => items.filter((i) => statusOf(i) === f).length;

  async function decide(item: ReviewItem, status: "approved" | "rejected" | "pending") {
    setError(null);
    setLocal((l) => ({ ...l, [item.id]: status }));
    const res = await fetch("/api/admin/review", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: item.kind, id: item.id, status }),
    });
    if (!res.ok) {
      setLocal((l) => ({ ...l, [item.id]: item.status }));
      setError("Couldn't save that decision. Please try again.");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <>
      <div role="tablist" className="flex gap-1 rounded-full bg-paper-2 p-1 w-fit">
        {(["pending", "approved", "rejected"] as Filter[]).map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold capitalize ${filter === f ? "bg-white shadow" : "text-ink-2"}`}
          >
            {f} <span className="text-muted font-normal">{count(f)}</span>
          </button>
        ))}
      </div>
      {error && <p role="alert" className="mt-4 text-sm text-accent">{error}</p>}

      <ul className="mt-6 space-y-4">
        {shown.length === 0 && <li className="card p-10 text-center text-muted">Nothing {filter} right now.</li>}
        {shown.map((i) => (
          <li key={i.id} className="card p-5 flex gap-5 fade-in" data-testid="review-item">
            {i.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={i.photoUrl} alt="" className="w-28 h-28 rounded-lg object-cover shrink-0 hidden sm:block" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 ${i.kind === "field" ? "bg-antarctica/10 text-antarctica" : "bg-arctic/10 text-arctic"}`}>
                  {i.kind === "field" ? "Field entry" : "AI draft"}
                </span>
                <span className="font-semibold">{i.title}</span>
              </div>
              <p className="text-xs text-muted mt-1">{i.meta}</p>
              <p className="text-sm text-ink-2 mt-3 whitespace-pre-line line-clamp-6">{i.body}</p>
              {i.source && (
                <p className="text-xs mt-3">
                  <span className="text-muted">Source: </span>
                  <Link href={i.source.href} className="underline" target="_blank">
                    {i.source.label}
                  </Link>
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              {filter !== "approved" && (
                <button className="btn !py-1.5 !px-4 !text-sm bg-ok text-white hover:opacity-90" onClick={() => decide(i, "approved")}>
                  Approve
                </button>
              )}
              {filter !== "rejected" && (
                <button className="btn btn-ghost !py-1.5 !px-4 !text-sm" onClick={() => decide(i, "rejected")}>
                  Reject
                </button>
              )}
              {filter !== "pending" && (
                <button className="text-xs underline text-muted" onClick={() => decide(i, "pending")}>
                  Move back to pending
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
