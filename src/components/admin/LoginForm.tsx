"use client";

import { useActionState } from "react";
import { login } from "@/app/admin/actions";

export function LoginForm() {
  const [error, action, pending] = useActionState(login, null);
  return (
    <div className="mx-auto max-w-sm px-5 py-24">
      <form action={action} className="card p-6 space-y-4">
        <div>
          <p className="eyebrow">NCPOR outreach desk</p>
          <h1 className="font-serif text-3xl">Review sign-in</h1>
        </div>
        <label className="block">
          <span className="text-sm font-semibold">Passcode</span>
          <input name="passcode" type="password" required autoFocus className="mt-1 w-full rounded-lg border border-line px-3 py-2.5 bg-paper focus:bg-white focus:border-ink outline-none" />
        </label>
        {error && <p role="alert" className="text-sm text-accent">{error}</p>}
        <button className="btn btn-primary w-full justify-center" disabled={pending}>
          {pending ? "Checking…" : "Sign in"}
        </button>
        <p className="text-xs text-muted">Prototype: a single shared passcode set by ADMIN_PASSCODE (default “ncpor2026”).</p>
      </form>
    </div>
  );
}
