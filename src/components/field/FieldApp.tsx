"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useEffect, useRef, useState } from "react";
import { compressImage } from "@/lib/offline/compress";
import { enqueue, fieldDb, type LocalEntry } from "@/lib/offline/db";
import { refreshReviewStatus, syncAll } from "@/lib/offline/sync";
import { regionLabel } from "@/lib/regions";

interface Station {
  slug: string;
  name: string;
  region: string;
}

const ACTIVITIES = [
  "Sea-ice drilling",
  "Ice-core drilling",
  "Lake sampling",
  "Weather / atmosphere",
  "Glacier observation",
  "Wildlife sighting",
  "Station operations",
  "Other",
];

type LogLine = { t: string; msg: string; tone?: "ok" | "warn" | "err" };

function useNetworkStatus() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

export function FieldApp({ stations }: { stations: Station[] }) {
  const browserOnline = useNetworkStatus();
  const [simulateOffline, setSimulateOffline] = useState(false);
  const online = browserOnline && !simulateOffline;
  const onlineRef = useRef(online);
  onlineRef.current = online;

  const entries = useLiveQuery(() => fieldDb.entries.orderBy("createdAt").reverse().toArray(), []);
  const [log, setLog] = useState<LogLine[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [swReady, setSwReady] = useState<"unsupported" | "dev" | "installing" | "ready">("installing");

  const addLog = useCallback((msg: string, tone?: LogLine["tone"]) => {
    const t = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLog((l) => [{ t, msg, tone }, ...l].slice(0, 8));
  }, []);

  const runSync = useCallback(
    async (reason: string) => {
      const pending = await fieldDb.entries.where("status").anyOf("queued", "failed").count();
      if (!pending) {
        if (onlineRef.current) await refreshReviewStatus().catch(() => undefined);
        return;
      }
      if (!onlineRef.current) return;
      setSyncing(true);
      addLog(`${reason}: uploading ${pending} entr${pending === 1 ? "y" : "ies"}…`);
      const r = await syncAll({ isOnline: () => onlineRef.current });
      setSyncing(false);
      if (r.synced) addLog(`✓ ${r.synced} synced to NCPOR and sent for review`, "ok");
      if (r.failed) addLog(`${r.failed} could not be uploaded, will retry`, "err");
      if (r.offline) addLog("Connection dropped: entries stay safely queued", "warn");
    },
    [addLog],
  );

  // Sync when the connection comes back (real or simulated).
  const prevOnline = useRef<boolean | null>(null);
  useEffect(() => {
    if (prevOnline.current === null) {
      prevOnline.current = online;
      runSync("On open");
      return;
    }
    if (online && !prevOnline.current) {
      addLog("Connection restored", "ok");
      runSync("Auto-sync");
    }
    if (!online && prevOnline.current) addLog("Connection lost: new entries will be kept on this device", "warn");
    prevOnline.current = online;
  }, [online, runSync, addLog]);

  // Periodic retry and review-status refresh.
  useEffect(() => {
    const id = setInterval(() => runSync("Retry"), 30_000);
    return () => clearInterval(id);
  }, [runSync]);

  // Service worker: makes this page open with no network (production builds only).
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return setSwReady("unsupported");
    if (process.env.NODE_ENV !== "production") return setSwReady("dev");
    navigator.storage?.persist?.().catch(() => undefined);
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(() => navigator.serviceWorker.ready)
      .then((reg) => {
        const urls = [location.pathname, ...performance.getEntriesByType("resource").map((e) => e.name)];
        reg.active?.postMessage({ type: "CACHE_URLS", urls });
        setSwReady("ready");
      })
      .catch(() => setSwReady("unsupported"));
  }, []);

  const queued = entries?.filter((e) => e.status !== "synced").length ?? 0;

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      {/* Status bar */}
      <div className={`rounded-2xl p-4 md:p-5 flex flex-wrap items-center gap-4 transition-colors ${online ? "bg-ok/10" : "bg-warn/15"}`}>
        <div className="flex items-center gap-3">
          <span className={`relative w-3.5 h-3.5 rounded-full ${online ? "bg-ok" : "bg-warn"}`}>
            {online && <span className="absolute inset-0 rounded-full bg-ok animate-ping opacity-60" />}
          </span>
          <div>
            <p className="font-semibold" data-testid="net-status">
              {online ? "Online" : "Offline"}
              {simulateOffline && browserOnline ? " (simulated)" : ""}
            </p>
            <p className="text-xs text-ink-2">
              {online ? "Entries upload as soon as you save them." : "Keep logging. Everything is saved on this device and will sync later."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 ml-auto">
          <span className="text-sm" data-testid="queue-count">
            <strong className="font-serif text-2xl align-middle">{queued}</strong> waiting to sync
          </span>
          <button className="btn btn-primary !py-2" disabled={!online || syncing || queued === 0} onClick={() => runSync("Manual sync")}>
            {syncing ? "Syncing…" : "Sync now"}
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={simulateOffline} onChange={(e) => setSimulateOffline(e.target.checked)} className="accent-accent" />
          Simulate no connection (for demos). A real outage (airplane mode or DevTools → Offline) works the same way.
        </label>
        <span>
          Offline page cache:{" "}
          {swReady === "ready" ? "✓ this page opens without a network" : swReady === "dev" ? "on in production builds (npm start)" : swReady === "unsupported" ? "not supported in this browser" : "installing…"}
        </span>
      </div>

      <div className="grid lg:grid-cols-[1fr_1fr] gap-8 mt-8">
        <EntryForm stations={stations} online={online} onSaved={(e) => {
          addLog(`Saved “${e.activity}” at ${e.stationName} on this device`);
          if (onlineRef.current) runSync("Auto-sync");
        }} />

        <section aria-labelledby="queue-h">
          <div className="flex items-baseline justify-between">
            <h2 id="queue-h" className="font-serif text-2xl">On this device</h2>
            <span className="text-xs text-muted">{entries?.length ?? 0} entries</span>
          </div>
          <ul className="mt-4 space-y-3" data-testid="entry-list">
            {entries?.length === 0 && <li className="card p-6 text-sm text-muted text-center">No entries yet. Log your first observation.</li>}
            {entries?.map((e) => <EntryRow key={e.id} entry={e} />)}
          </ul>

          <div className="mt-8">
            <p className="eyebrow mb-2">Sync activity</p>
            <ol className="text-xs font-mono space-y-1" aria-live="polite">
              {log.length === 0 && <li className="text-muted">Nothing yet.</li>}
              {log.map((l, i) => (
                <li key={i} className={l.tone === "ok" ? "text-ok" : l.tone === "warn" ? "text-warn" : l.tone === "err" ? "text-accent" : "text-ink-2"}>
                  <span className="text-muted">{l.t}</span> {l.msg}
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>
    </div>
  );
}

function EntryForm({ stations, online, onSaved }: { stations: Station[]; online: boolean; onSaved: (e: LocalEntry) => void }) {
  const [name, setName] = useState("");
  const [station, setStation] = useState(stations.find((s) => s.slug === "bharati")?.slug ?? stations[0]?.slug ?? "");
  const [activity, setActivity] = useState(ACTIVITIES[0]);
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      setName(localStorage.getItem("field.name") ?? "");
    } catch {}
  }, []);

  useEffect(() => {
    if (!photo) return setPreview(null);
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!name.trim() || !notes.trim()) return;
    setBusy(true);
    try {
      localStorage.setItem("field.name", name.trim());
    } catch {}
    const img = photo ? await compressImage(photo) : null;
    const st = stations.find((s) => s.slug === station)!;
    const row = await enqueue({
      station,
      stationName: st.name,
      activity,
      notes: notes.trim(),
      submittedBy: name.trim(),
      capturedAt: new Date().toISOString(),
      photo: img?.blob,
      photoType: img?.type,
    });
    setNotes("");
    setPhoto(null);
    if (fileInput.current) fileInput.current.value = "";
    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    onSaved(row);
  }

  return (
    <form onSubmit={submit} className="card p-6 space-y-4" aria-labelledby="form-h">
      <div>
        <p className="eyebrow">NCPOR Field Log</p>
        <h1 id="form-h" className="font-serif text-3xl">New field entry</h1>
      </div>
      <label className="block">
        <span className="text-sm font-semibold">Your name</span>
        <input required value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2.5 bg-paper focus:bg-white focus:border-ink outline-none" placeholder="e.g. A. Kulkarni" />
      </label>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm font-semibold">Station / site</span>
          <select value={station} onChange={(e) => setStation(e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2.5 bg-paper">
            {stations.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name} · {regionLabel(s.region)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-semibold">Activity</span>
          <select value={activity} onChange={(e) => setActivity(e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2.5 bg-paper">
            {ACTIVITIES.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="block">
        <span className="text-sm font-semibold">Notes</span>
        <textarea required value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} maxLength={4000} className="mt-1 w-full rounded-lg border border-line px-3 py-2.5 bg-paper focus:bg-white focus:border-ink outline-none" placeholder="What did you observe or measure? Include numbers, locations and conditions." />
      </label>
      <div>
        <span className="text-sm font-semibold">Photo (optional)</span>
        <div className="mt-1 flex items-center gap-4">
          <label className="btn btn-ghost cursor-pointer">
            📷 {photo ? "Change photo" : "Add photo"}
            <input ref={fileInput} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
          </label>
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Selected photo preview" className="h-16 w-24 object-cover rounded-lg border border-line" />
          )}
        </div>
        <p className="text-xs text-muted mt-1">Photos are resized on the device before upload to save bandwidth.</p>
      </div>
      <button className="btn btn-accent w-full justify-center !py-3" disabled={busy}>
        {busy ? "Saving…" : online ? "Save & sync" : "Save to device (offline)"}
      </button>
      {saved && (
        <p role="status" className="text-sm text-ok text-center fade-in">
          ✓ Saved on this device{online ? ", uploading now" : ". It will upload when you're back online"}.
        </p>
      )}
    </form>
  );
}

const STATUS_STYLE: Record<LocalEntry["status"], { label: string; cls: string }> = {
  queued: { label: "Waiting for connection", cls: "bg-warn/15 text-warn" },
  syncing: { label: "Uploading…", cls: "bg-antarctica/10 text-antarctica" },
  synced: { label: "Synced", cls: "bg-ok/10 text-ok" },
  failed: { label: "Upload failed", cls: "bg-accent/10 text-accent" },
};

function EntryRow({ entry }: { entry: LocalEntry }) {
  const [thumb, setThumb] = useState<string | null>(null);
  useEffect(() => {
    if (!entry.photo) return;
    const url = URL.createObjectURL(entry.photo);
    setThumb(url);
    return () => URL.revokeObjectURL(url);
  }, [entry.photo]);

  const s = STATUS_STYLE[entry.status];
  const review =
    entry.status === "synced"
      ? entry.reviewStatus === "approved"
        ? "Published on the portal"
        : entry.reviewStatus === "rejected"
          ? "Not published"
          : "In NCPOR review"
      : null;

  return (
    <li className="card p-4 flex gap-4 fade-in" data-status={entry.status}>
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
      ) : (
        <span className="w-16 h-16 rounded-lg bg-paper-2 grid place-items-center text-xl shrink-0" aria-hidden>
          📝
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-[11px] font-bold rounded px-1.5 py-0.5 ${s.cls}`}>{s.label}</span>
          {review && <span className="text-[11px] text-muted">{review}</span>}
        </div>
        <p className="font-semibold text-sm mt-1">
          {entry.activity} · {entry.stationName}
        </p>
        <p className="text-sm text-ink-2 line-clamp-2">{entry.notes}</p>
        <p className="text-[11px] text-muted mt-1">
          Logged {new Date(entry.capturedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          {entry.syncedAt && ` · synced ${new Date(entry.syncedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`}
          {entry.status === "failed" && entry.lastError && ` · ${entry.lastError}`}
        </p>
      </div>
    </li>
  );
}
