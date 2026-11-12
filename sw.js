/* MyEV Calculator service worker: keeps the app itself on the device so it opens with no signal.
   Pages are served from the saved copy straight away and refreshed in the background, so a new
   version appears the next time the app is opened. Live lookups (road miles, sharing) are never cached. */
const CACHE = "myev-shell-v2";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.origin !== location.origin) return;            // other websites: not touched
  if (u.pathname.endsWith("/ping.txt")) return;         // connection check: always the network
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const hit = await cache.match(r, { ignoreSearch: true });
      const fresh = fetch(r).then(res => {
        if (res && res.ok) cache.put(r.mode === "navigate" ? "./" : r, res.clone());
        return res;
      }).catch(() => null);
      if (hit) { e.waitUntil(fresh); return hit; }
      const res = await fresh;
      if (res) return res;
      if (r.mode === "navigate") { const home = await cache.match("./"); if (home) return home; }
      return Response.error();
    })
  );
});
