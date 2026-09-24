/* NCPOR Field app service worker.
 *
 * Scope is deliberately narrow: it makes the /field page and its assets load with no
 * network. Everything else on the site passes straight through to the network.
 *
 *  - /field navigations: network-first, falling back to the cached page when offline.
 *  - /_next/static/*, fonts, art: cache-first (these URLs are content-hashed or immutable).
 *  - The page posts the list of resources it loaded, so assets fetched before this
 *    worker took control are cached too.
 */
const VERSION = "field-v1";
const SHELL = "/field";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((c) => c.addAll([SHELL, "/manifest.webmanifest", "/icons/field.svg"]))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "CACHE_URLS") return;
  const urls = (event.data.urls || []).filter((u) => {
    try {
      return new URL(u, self.location.origin).origin === self.location.origin;
    } catch {
      return false;
    }
  });
  event.waitUntil(
    caches.open(VERSION).then((c) =>
      Promise.all(urls.map((u) => c.add(u).catch(() => undefined))),
    ),
  );
});

const isStatic = (url) =>
  url.pathname.startsWith("/_next/static/") ||
  url.pathname.startsWith("/images/") ||
  url.pathname.startsWith("/icons/") ||
  url.pathname === "/manifest.webmanifest";

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate" && url.pathname === SHELL) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(SHELL, copy));
          }
          return res;
        })
        .catch(() => caches.match(SHELL).then((r) => r || offlineResponse())),
    );
    return;
  }

  if (isStatic(url)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(VERSION).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});

function offlineResponse() {
  return new Response(
    "<!doctype html><meta name=viewport content='width=device-width'><title>Offline</title>" +
      "<body style='font-family:system-ui;padding:2rem'><h1>You're offline</h1>" +
      "<p>Open the Field app once while online so it can be saved for offline use.</p></body>",
    { headers: { "Content-Type": "text/html" }, status: 503 },
  );
}
