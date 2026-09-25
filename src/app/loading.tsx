export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-16" role="status" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="animate-pulse space-y-4">
        <div className="h-3 w-32 rounded bg-paper-2" />
        <div className="h-10 w-2/3 rounded bg-paper-2" />
        <div className="h-4 w-1/2 rounded bg-paper-2" />
        <div className="grid md:grid-cols-3 gap-5 pt-6">
          <div className="h-48 rounded-2xl bg-paper-2" />
          <div className="h-48 rounded-2xl bg-paper-2" />
          <div className="h-48 rounded-2xl bg-paper-2" />
        </div>
      </div>
    </div>
  );
}
