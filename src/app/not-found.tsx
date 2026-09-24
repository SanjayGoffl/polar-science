import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-5 py-32 text-center">
      <p className="eyebrow">404</p>
      <h1 className="font-serif text-5xl mt-2">Lost in the whiteout.</h1>
      <p className="text-ink-2 mt-4">We couldn&apos;t find that page.</p>
      <Link href="/explore" className="btn btn-primary mt-8">Back to the map</Link>
    </div>
  );
}
