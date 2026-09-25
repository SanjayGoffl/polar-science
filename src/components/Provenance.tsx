/** Makes the line between official, source-linked content and illustrative sample data impossible to miss. */

export function StatusBadge({ status, className = "" }: { status: string; className?: string }) {
  const official = status === "official";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
        official ? "bg-ok/15 text-ok" : "bg-warn/15 text-warn"
      } ${className}`}
      title={official ? "Linked to an official NCPOR source" : "Illustrative sample data for this prototype"}
    >
      {official ? "✓ Official source" : "Illustrative sample"}
    </span>
  );
}

export function SourceNotice({
  status,
  sourceUrl,
  what = "document",
  tone = "light",
}: {
  status: string;
  sourceUrl?: string | null;
  what?: string;
  tone?: "light" | "dark";
}) {
  const box = tone === "dark" ? "bg-white/10 text-white/90 border-white/20" : "bg-warn/10 text-ink-2 border-warn/30";
  if (status === "official" && sourceUrl) {
    return (
      <p className={`rounded-lg border px-3 py-2 text-xs ${tone === "dark" ? box : "bg-ok/10 border-ok/30 text-ink-2"}`}>
        <StatusBadge status="official" /> This {what} comes from an official NCPOR source.{" "}
        <a href={sourceUrl} target="_blank" rel="noreferrer" className="underline font-semibold">
          View original ↗
        </a>
      </p>
    );
  }
  return (
    <p className={`rounded-lg border px-3 py-2 text-xs leading-relaxed ${box}`}>
      <StatusBadge status="illustrative" /> This {what} is <strong>illustrative sample content</strong> written for this prototype. It is not
      an NCPOR publication, and its figures are not real findings. Official expedition reports are published by{" "}
      <a href="https://www.ncpor.res.in/" target="_blank" rel="noreferrer" className="underline">
        NCPOR ↗
      </a>{" "}
      and datasets by the{" "}
      <a href="https://npdc.ncaor.gov.in/" target="_blank" rel="noreferrer" className="underline">
        NPDC ↗
      </a>
      .
    </p>
  );
}
