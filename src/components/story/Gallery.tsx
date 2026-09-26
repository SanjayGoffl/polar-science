"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export interface GalleryItem {
  id: string;
  kind: "photo" | "video";
  title: string;
  caption: string;
  altText: string;
  url: string;
  youtubeId: string | null;
  author: string;
  license: string;
  licenseUrl: string | null;
  sourceUrl: string;
}

const thumb = (m: GalleryItem) => (m.kind === "video" && m.youtubeId ? `https://i.ytimg.com/vi/${m.youtubeId}/hqdefault.jpg` : m.url);

function Credit({ m, dark = false }: { m: GalleryItem; dark?: boolean }) {
  const cls = dark ? "text-paper/60" : "text-muted";
  return (
    <p className={`text-[11px] ${cls}`}>
      {m.author} ·{" "}
      {m.licenseUrl ? (
        <a href={m.licenseUrl} target="_blank" rel="noreferrer" className="underline">
          {m.license}
        </a>
      ) : (
        m.license
      )}{" "}
      ·{" "}
      <a href={m.sourceUrl} target="_blank" rel="noreferrer" className="underline">
        source ↗
      </a>
    </p>
  );
}

export function Gallery({ items }: { items: GalleryItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open === null) dialog.current?.close();
    else if (!dialog.current?.open) dialog.current?.showModal();
  }, [open]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setOpen((o) => (o === null ? o : (o + 1) % items.length));
      if (e.key === "ArrowLeft") setOpen((o) => (o === null ? o : (o - 1 + items.length) % items.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, items.length]);

  if (!items.length) return <p className="mt-8 text-sm text-muted">No licensed photos or official videos are linked to this story yet.</p>;
  const cur = open !== null ? items[open] : null;

  return (
    <>
      <ul className="mt-10 grid grid-cols-2 md:grid-cols-3 gap-4">
        {items.map((m, i) => (
          <li key={m.id} className={i === 0 ? "col-span-2 row-span-2" : ""}>
            <button onClick={() => setOpen(i)} className="group block w-full text-left" aria-label={`${m.kind === "video" ? "Play video" : "View photo"}: ${m.title}`}>
              <span className="relative block overflow-hidden rounded-xl aspect-[4/3] bg-paper-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumb(m)} alt={m.altText} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                {m.kind === "video" && (
                  <span className="absolute inset-0 grid place-items-center">
                    <span className="w-14 h-14 rounded-full bg-black/65 text-white grid place-items-center text-xl" aria-hidden>
                      ▶
                    </span>
                  </span>
                )}
              </span>
              <span className="block text-xs text-ink-2 mt-2 line-clamp-2">{m.caption}</span>
            </button>
            <Credit m={m} />
          </li>
        ))}
      </ul>
      <dialog
        ref={dialog}
        onClose={() => setOpen(null)}
        onClick={(e) => e.target === dialog.current && setOpen(null)}
        className="m-auto max-w-5xl w-[92vw] rounded-2xl p-0 backdrop:bg-black/80 bg-ink text-paper"
        aria-label={cur?.title}
      >
        {cur && (
          <figure>
            <div className="relative aspect-video bg-black">
              {cur.kind === "video" && cur.youtubeId ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${cur.youtubeId}?autoplay=1&rel=0`}
                  title={cur.title}
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full"
                />
              ) : (
                <Image src={cur.url} alt={cur.altText} fill className="object-contain" sizes="92vw" />
              )}
            </div>
            <figcaption className="p-5 flex gap-4 items-start">
              <div className="flex-1">
                <p className="font-semibold">{cur.title}</p>
                <p className="text-sm text-paper/80 mt-1">{cur.caption}</p>
                <div className="mt-2">
                  <Credit m={cur} dark />
                </div>
              </div>
              <span className="text-xs text-paper/55 whitespace-nowrap">
                {open! + 1} / {items.length}
              </span>
              <button onClick={() => setOpen(null)} className="btn btn-light !py-1 !px-3 !text-xs" autoFocus>
                Close
              </button>
            </figcaption>
          </figure>
        )}
      </dialog>
    </>
  );
}
