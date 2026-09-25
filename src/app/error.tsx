"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl px-5 py-28 text-center" role="alert">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="font-serif text-4xl mt-2">We hit a crevasse.</h1>
      <p className="text-ink-2 mt-4">This page couldn&apos;t load. It may be a temporary problem.</p>
      <div className="mt-8 flex justify-center gap-3">
        <button onClick={() => retry()} className="btn btn-primary">
          Try again
        </button>
        <Link href="/" className="btn btn-ghost">
          Home
        </Link>
      </div>
      {error.digest && <p className="text-xs text-muted mt-6">Reference: {error.digest}</p>}
    </div>
  );
}
