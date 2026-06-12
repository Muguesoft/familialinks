// Service Worker – FamiliaLinks
const CACHE = "familialinks-v1";
const PRECACHE = [
  "./",
  "./index.html",
  "./css/style.css",
  "./manifest.json",
  "./icon.svg"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  // Solo cachear requests GET del mismo origen
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  // No interceptar Firebase ni API de Anthropic
  if (url.hostname.includes("firebase") || url.hostname.includes("anthropic") || url.hostname.includes("gstatic")) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
      return cached || network;
    })
  );
});
