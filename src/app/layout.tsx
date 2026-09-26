import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { ReopenTourButton, WelcomeTour } from "@/components/WelcomeTour";
import { getSiteContent, type TourStep } from "@/lib/copy";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["opsz"] });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: { default: "Polar Stories · NCPOR", template: "%s · Polar Stories" },
  description:
    "Explore India's polar expeditions to Antarctica, the Arctic and the Himalaya through maps, timelines and stories, with plain-language explanations grounded in NCPOR's reports.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#10202b" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { t, json } = await getSiteContent();
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
              <p className="max-w-xl">{t("footer.about")}</p>
              <p className="mt-3 flex flex-wrap gap-4">
                <a className="underline" href="https://npdc.ncpor.res.in/npdc/homepage.action" target="_blank" rel="noreferrer">National Polar Data Center ↗</a>
                <a className="underline" href="https://ncpor.res.in/" target="_blank" rel="noreferrer">NCPOR ↗</a>
              </p>
            </div>
            <div className="md:text-right space-y-1">
              <p>{t("footer.credits")}</p>
              <p>
                <ReopenTourButton />
              </p>
            </div>
          </div>
        </footer>
        <WelcomeTour steps={json<TourStep[]>("tour.steps", [])} />
      </body>
    </html>
  );
}
