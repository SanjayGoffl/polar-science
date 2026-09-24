import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["opsz"] });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: { default: "Polar Stories · NCPOR", template: "%s · Polar Stories" },
  description:
    "Explore India's polar expeditions to Antarctica, the Arctic and the Himalaya through maps, timelines and stories, with plain-language explanations grounded in NCPOR's reports.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#10202b" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line mt-24">
          <div className="mx-auto max-w-6xl px-5 py-10 grid gap-6 md:grid-cols-[2fr_1fr] text-sm text-muted">
            <div>
              <p className="font-serif text-lg text-ink mb-2">Polar Stories</p>
              <p className="max-w-xl">
                A public outreach layer for the National Centre for Polar and Ocean Research (NCPOR), Ministry of Earth Sciences.
                It links to NCPOR&apos;s official data holdings at the{" "}
                <a className="underline" href="https://npdc.ncaor.gov.in/" target="_blank" rel="noreferrer">
                  National Polar Data Center
                </a>{" "}
                rather than replacing them.
              </p>
            </div>
            <p className="md:text-right">
              <strong className="text-ink-2">Prototype notice:</strong> station names and locations are real. Expedition narratives,
              reports, figures and people shown here are illustrative sample data standing in for a future NPDC / repository
              integration. SIH 2026 · PS 26063.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
