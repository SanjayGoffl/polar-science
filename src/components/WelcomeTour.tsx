"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const KEY = "polarstories.tour.v1";

const STEPS = [
  { title: "Explore by place and time", body: "Pick a station on the map or a year on the timeline to find expeditions, milestones and their sources.", href: "/explore", cta: "Open the map" },
  { title: "Read the stories", body: "Each story walks through why an expedition went, where, who took part and what it found, quoting official records.", href: "/stories", cta: "See the stories" },
  { title: "Explain it simply", body: "On any document, get a plain-language version for students or the public, and a social post. Every sentence cites the section it came from.", href: "/stories", cta: "Try it in a story" },
  { title: "Log from the field, even offline", body: "Researchers at the stations can log notes and photos without a connection. They sync later and are published after review.", href: "/field", cta: "Open the Field app" },
];

/** A four-step introduction shown once to first-time visitors; it can be reopened from the footer. */
export function WelcomeTour() {
  const [step, setStep] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const open = () => setStep(0);
    window.addEventListener("polarstories:tour", open);
    try {
      if (!localStorage.getItem(KEY)) setStep(0);
    } catch {
      /* storage unavailable: skip the tour */
    }
    return () => window.removeEventListener("polarstories:tour", open);
  }, []);

  useEffect(() => {
    if (step === null) dialog.current?.close();
    else if (!dialog.current?.open) dialog.current?.showModal();
  }, [step]);

  function close() {
    try {
      localStorage.setItem(KEY, "done");
    } catch {}
    setStep(null);
  }

  const s = step !== null ? STEPS[step] : null;
  return (
    <dialog ref={dialog} onClose={close} aria-labelledby="tour-title" className="m-auto w-[min(92vw,30rem)] rounded-2xl p-0 backdrop:bg-black/50 bg-white text-ink shadow-2xl">
      {s && (
        <div className="p-6">
          <p className="eyebrow">
            Welcome · {step! + 1} of {STEPS.length}
          </p>
          <h2 id="tour-title" className="font-serif text-2xl mt-2">
            {s.title}
          </h2>
          <p className="text-ink-2 mt-3 leading-relaxed">{s.body}</p>
          <div className="mt-5 flex gap-1.5" aria-hidden>
            {STEPS.map((_, i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= step! ? "bg-accent" : "bg-paper-2"}`} />
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Link href={s.href} onClick={close} className="btn btn-ghost !text-sm !py-2">
              {s.cta}
            </Link>
            <button onClick={close} className="ml-auto text-sm text-muted underline">
              Skip
            </button>
            {step! < STEPS.length - 1 ? (
              <button onClick={() => setStep(step! + 1)} className="btn btn-primary !text-sm !py-2" autoFocus>
                Next
              </button>
            ) : (
              <button onClick={close} className="btn btn-primary !text-sm !py-2" autoFocus>
                Start exploring
              </button>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}

export function ReopenTourButton() {
  return (
    <button onClick={() => window.dispatchEvent(new Event("polarstories:tour"))} className="underline hover:text-ink">
      Show the welcome tour
    </button>
  );
}
