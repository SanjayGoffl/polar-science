/** Shows where a piece of content comes from: publisher, date retrieved and a link to the original. */

export function SourceNotice({
  publisher,
  url,
  retrievedAt,
  what = "document",
}: {
  publisher: string;
  url: string;
  retrievedAt?: string | null;
  what?: string;
}) {
  return (
    <p className="rounded-lg border border-ok/30 bg-ok/10 px-3 py-2 text-xs text-ink-2 leading-relaxed">
      <span className="inline-flex items-center rounded bg-ok/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ok">✓ Official source</span>{" "}
      This {what} is reproduced verbatim from {publisher}
      {retrievedAt ? ` (retrieved ${new Date(retrievedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })})` : ""}.{" "}
      <a href={url} target="_blank" rel="noreferrer" className="underline font-semibold">
        View the original ↗
      </a>
    </p>
  );
}
