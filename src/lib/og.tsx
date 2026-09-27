import { ImageResponse } from "next/og";

/** Shared visual chrome for opengraph-image routes: brand, title, one verbatim quote, source line. */
export const OG_SIZE = { width: 1200, height: 630 };

const COLORS = {
  paper: "#f5f8fa",
  ink: "#0e2a3b",
  ink2: "#3a5363",
  muted: "#677c89",
  accent: "#0b7a99",
};

function truncateQuote(text: string, max = 220) {
  const clean = text.trim().replace(/\s+/g, " ");
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : max)}…`;
}

export function renderShareCard(opts: { eyebrow: string; title: string; quote: string; source: string }) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: COLORS.paper,
          padding: "64px 72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                background: COLORS.ink,
                color: COLORS.paper,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 18,
              }}
            >
              PS
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: COLORS.ink }}>Polar Stories</div>
          </div>
          <div style={{ marginTop: 28, fontSize: 15, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: COLORS.accent }}>
            {opts.eyebrow}
          </div>
          <div style={{ marginTop: 12, fontSize: 52, fontWeight: 700, color: COLORS.ink, lineHeight: 1.1, maxWidth: 1000 }}>{opts.title}</div>
          <div
            style={{
              display: "flex",
              marginTop: 28,
              fontSize: 26,
              color: COLORS.ink2,
              lineHeight: 1.4,
              maxWidth: 980,
              borderLeft: `4px solid ${COLORS.accent}`,
              paddingLeft: 24,
            }}
          >
            {`“${truncateQuote(opts.quote)}”`}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 20, color: COLORS.muted }}>{opts.source}</div>
      </div>
    ),
    OG_SIZE,
  );
}
