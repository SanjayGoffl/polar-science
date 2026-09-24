export function SearchBox({ compact = false, defaultValue = "" }: { compact?: boolean; defaultValue?: string }) {
  const id = compact ? "q-header" : "q-main";
  return (
    <form action="/search" role="search" className="relative">
      <label htmlFor={id} className="sr-only">
        Search expeditions, stations and reports
      </label>
      <input
        id={id}
        name="q"
        defaultValue={defaultValue}
        placeholder={compact ? "Search…" : "Search expeditions, stations, reports… try “sea ice” or “glacier”"}
        className={`w-full rounded-full border border-line bg-white/80 focus:bg-white outline-none focus:border-ink transition ${
          compact ? "h-9 pl-9 pr-3 text-sm" : "h-14 pl-12 pr-28 text-base shadow-sm"
        }`}
      />
      <svg
        className={`absolute top-1/2 -translate-y-1/2 text-muted ${compact ? "left-3 w-4 h-4" : "left-4 w-5 h-5"}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      {!compact && <button className="btn btn-primary absolute right-2 top-1/2 -translate-y-1/2">Search</button>}
    </form>
  );
}
