/* service-worker.js — ORG HUB / Cloudflare version */

const CORE = "https://orghubmulticlub.orghubsystems.workers.dev";
const PUSH_CORE = "https://broken-wind-9e0b.orghubsystems.workers.dev";

const CACHE_NAME = "orghub-static-v3";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/service-worker.js",
  "/icon-192.png",
  "/icon-512.png",
];

// install: cache minimalnych statyków
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Cache-first dla statyków z tego origin, network dla reszty
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;

      return fetch(e.request)
        .then((resp) => {
          // cache tylko zasoby z tej samej domeny
          if (url.origin === self.location.origin && resp && resp.status === 200) {
            const copy = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, copy)).catch(() => {});
          }
          return resp;
        })
        .catch(() => cached);
    })
  );
});

/******************** PUSH: odbiór i kliknięcie ********************/
self.addEventListener("push", (event) => {
  event.waitUntil((async () => {
    let payload = null;

    // 1) jeśli payload jednak jest — spróbuj go odczytać
    try {
      payload = event.data ? await event.data.json() : null;
    } catch (e) {
      payload = null;
    }

    // 2) jeśli payloadu brak, pobierz wiadomość z Workera
    if (!payload) {
      try {
        const metaResp = await caches
          .open("orghub-push-meta")
          .then((cache) => cache.match("/push-meta.json"));

        const meta = metaResp ? await metaResp.json() : null;

        const clubId = meta && meta.clubId ? String(meta.clubId).trim() : "";
        const numer  = meta && meta.numer  ? String(meta.numer).trim()  : "";

        if (clubId && numer) {
          const pullUrl =
            PUSH_CORE + "/push/pull"
            + "?clubId=" + encodeURIComponent(clubId)
            + "&numer=" + encodeURIComponent(numer);

          const pullResp = await fetch(pullUrl, { cache: "no-store" });
          const pullJson = await pullResp.json().catch(() => null);

          if (pullJson && pullJson.success && pullJson.found && pullJson.message) {
            payload = pullJson.message;
          }
        }
      } catch (e) {
        payload = null;
      }
    }

    // 3) fallback
    const title = (payload && payload.title) ? String(payload.title) : "OrgHub";
    const body  = (payload && payload.body)  ? String(payload.body)  : "Push dotarł (brak/nieczytelny payload)";
    const url   = (payload && payload.url)
      ? String(payload.url)
      : (self.location.origin + "/");

    const options = {
      body,
      icon: (payload && payload.icon) ? String(payload.icon) : (self.location.origin + "/icon-192.png"),
      badge: (payload && payload.badge) ? String(payload.badge) : (self.location.origin + "/icon-192.png"),
      tag: (payload && payload.tag) ? String(payload.tag) : "orghub",
      data: {
        url,
        ...((payload && payload.data) ? payload.data : {})
      },
      renotify: true
    };

    await self.registration.showNotification(title, options);
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = (event.notification && event.notification.data && event.notification.data.url)
    ? String(event.notification.data.url)
    : (self.location.origin + "/");

  event.waitUntil((async () => {
    const allClients = await clients.matchAll({ type: "window", includeUncontrolled: true });

    for (const c of allClients) {
      if (c.url && c.url.startsWith(self.location.origin + "/")) {
        await c.focus();
        await c.navigate(url);
        return;
      }
    }

    await clients.openWindow(url);
  })());
});
