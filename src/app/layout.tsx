import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { ReopenTourButton, WelcomeTour } from "@/components/WelcomeTour";

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
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" tabIndex={-1} className="flex-1 outline-none">
          {children}
        </main>
        <footer className="border-t border-line mt-24">
          <div className="mx-auto max-w-6xl px-5 py-10 grid gap-6 md:grid-cols-[2fr_1fr] text-sm text-muted">
            <div>
              <p className="font-serif text-lg text-ink mb-2">Polar Stories</p>
              <p className="max-w-xl">
                An outreach guide to the work of the National Centre for Polar and Ocean Research (NCPOR), Ministry of Earth Sciences. Text is
                quoted from official sources, with links to each original. Datasets are held by the{" "}
                <a className="underline" href="https://npdc.ncpor.res.in/npdc/homepage.action" target="_blank" rel="noreferrer">
                  National Polar Data Center
                </a>
                .
              </p>
            </div>
            <div className="md:text-right space-y-1">
              <p>Photos: Wikimedia Commons contributors and Government of India, under the licences shown with each image.</p>
              <p>
                <ReopenTourButton />
              </p>
            </div>
          </div>
        </footer>
        <WelcomeTour />
      </body>
    </html>
  );
}
