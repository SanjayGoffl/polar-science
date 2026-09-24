"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

interface Item {
  id: string;
  url: string;
  caption: string;
  altText: string;
  credit: string;
}

export function Gallery({ items }: { items: Item[] }) {
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

  const cur = open !== null ? items[open] : null;

  return (
    <>
      <ul className="mt-10 grid grid-cols-2 md:grid-cols-3 gap-4">
        {items.map((m, i) => (
          <li key={m.id} className={i === 0 ? "col-span-2 row-span-2" : ""}>
            <button onClick={() => setOpen(i)} className="group block w-full text-left">
              <span className={`relative block overflow-hidden rounded-xl ${i === 0 ? "aspect-[4/3]" : "aspect-[4/3]"}`}>
                <Image src={m.url} alt={m.altText} fill className="object-cover transition duration-700 group-hover:scale-105" />
              </span>
              <span className="block text-xs text-ink-2 mt-2 line-clamp-2">{m.caption}</span>
            </button>
          </li>
        ))}
      </ul>
      <dialog
        ref={dialog}
        onClose={() => setOpen(null)}
        onClick={(e) => e.target === dialog.current && setOpen(null)}
        className="m-auto max-w-5xl w-[92vw] rounded-2xl p-0 backdrop:bg-black/80 bg-ink text-paper"
      >
        {cur && (
          <figure>
            <div className="relative aspect-[16/10]">
              <Image src={cur.url} alt={cur.altText} fill className="object-cover" />
            </div>
            <figcaption className="p-5 flex gap-4 items-start">
              <div className="flex-1">
                <p>{cur.caption}</p>
                <p className="text-xs text-paper/55 mt-1">{cur.credit}</p>
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
