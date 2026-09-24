import Link from "next/link";
import { SearchBox } from "./SearchBox";

const NAV = [
  { href: "/explore", label: "Explore" },
  { href: "/expeditions/isea-43/story", label: "Stories" },
  { href: "/field", label: "Field app" },
  { href: "/admin", label: "Review" },
];

export function Logo() {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden>
      <circle cx="16" cy="16" r="15" fill="#10202b" />
      <path d="M5 21 L12 12 L16 17 L20 10 L27 21 Z" fill="#f6f5f1" />
      <path d="M12 12 L14 14.6 L10.6 14.2 Z M20 10 L22.2 13.6 L18.3 13.2 Z" fill="#c8472b" />
    </svg>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-[1000] bg-paper/85 backdrop-blur border-b border-line">
      <div className="mx-auto max-w-6xl px-5 h-16 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Logo />
          <span className="font-serif text-xl tracking-tight">Polar Stories</span>
          <span className="hidden sm:inline text-[10px] font-semibold tracking-widest uppercase text-muted border border-line rounded px-1.5 py-0.5">
            NCPOR
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-ink-2">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="hover:text-ink">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto w-full max-w-[15rem] hidden sm:block">
          <SearchBox compact />
        </div>
      </div>
      <nav className="md:hidden flex gap-5 px-5 pb-2 text-sm font-medium text-ink-2 overflow-x-auto">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href}>
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
