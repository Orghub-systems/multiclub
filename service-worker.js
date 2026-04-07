/* service-worker.js — ORG HUB / Cloudflare version */

const CORE = "https://orghubmulticlub.orghubsystems.workers.dev";
const PUSH_CORE = "https://broken-wind-9e0b.orghubsystems.workers.dev";

const SW_VERSION = new URL(self.location.href).searchParams.get("v") || "dev";
const CACHE_NAME = "orghub-static-v" + SW_VERSION;

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/icon-192.png",
  "/icon-512.png",
];

// install
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

// activate
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) =>
          key !== CACHE_NAME &&
          key !== "orghub-push-meta"
        )
        .map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

// fetch
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  const isSameOrigin = url.origin === self.location.origin;

  const isAppShell =
    isSameOrigin &&
    (
      url.pathname === "/" ||
      url.pathname.endsWith(".html") ||
      url.pathname.endsWith(".js") ||
      url.pathname.endsWith(".css")
    );

  const isImageAsset =
    isSameOrigin &&
    (
      url.pathname.endsWith(".png") ||
      url.pathname.endsWith(".jpg") ||
      url.pathname.endsWith(".jpeg") ||
      url.pathname.endsWith(".webp") ||
      url.pathname.endsWith(".svg")
    );

  // HTML / JS / CSS -> network first
  if (isAppShell) {
    e.respondWith((async () => {
      try {
        const resp = await fetch(e.request);
        if (resp && resp.status === 200) {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, copy)).catch(() => {});
        }
        return resp;
      } catch (err) {
        const cached = await caches.match(e.request);
        if (cached) return cached;
        throw err;
      }
    })());
    return;
  }

  // obrazki / ikony -> cache first
  if (isImageAsset) {
    e.respondWith((async () => {
      const cached = await caches.match(e.request);
      if (cached) return cached;

      const resp = await fetch(e.request);
      if (resp && resp.status === 200) {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, copy)).catch(() => {});
      }
      return resp;
    })());
    return;
  }

  // wszystko inne zawsze z sieci
  e.respondWith(fetch(e.request));
});

/******************** PUSH: odbiór i kliknięcie ********************/
async function readPushMeta_() {
  try {
    const metaResp = await caches.open("orghub-push-meta").then((cache) => cache.match("/push-meta.json"));
    return metaResp ? await metaResp.json() : null;
  } catch (e) {
    return null;
  }
}

function buildClubPushUrl_(clubId, fallbackUrl) {
  const cid = String(clubId || "").trim();
  if (cid) {
    return `https://${cid}.orghub.pl/?clubId=${encodeURIComponent(cid)}&source=push`;
  }
  return String(fallbackUrl || (self.location.origin + "/?source=push")).trim();
}

function normalizePushPayload_(rawPayload, meta) {
  const payload = rawPayload && typeof rawPayload === "object" ? rawPayload : {};
  const clubId =
    String(
      payload.clubId ||
      (payload.data && payload.data.clubId) ||
      (meta && meta.clubId) ||
      ""
    ).trim();

  const numer =
    String(
      payload.numer ||
      (payload.data && payload.data.numer) ||
      (meta && meta.numer) ||
      ""
    ).trim();

  const lines = [];

  if (payload.body) lines.push(String(payload.body).trim());
  if (payload.date) lines.push(`📅 ${String(payload.date).trim()}`);
  if (payload.time) lines.push(`⏰ ${String(payload.time).trim()}`);
  if (payload.groups) lines.push(`👥 ${String(payload.groups).trim()}`);
  if (payload.trainers) lines.push(`🏒 ${String(payload.trainers).trim()}`);
  if (payload.location) lines.push(`📍 ${String(payload.location).trim()}`);

  const body = lines.filter(Boolean).join("\n") || "Masz nowe powiadomienie w OrgHub.";

  const url = buildClubPushUrl_(
    clubId,
    payload.url || (payload.data && payload.data.url) || ""
  );

  return {
    title: String(payload.title || "OrgHub").trim(),
    body,
    icon: String(
      payload.icon ||
      (clubId ? `https://${clubId}.orghub.pl/icon-192.png` : (self.location.origin + "/icon-192.png"))
    ).trim(),
    badge: String(
      payload.badge ||
      (clubId ? `https://${clubId}.orghub.pl/icon-192.png` : (self.location.origin + "/icon-192.png"))
    ).trim(),
    tag: String(payload.tag || (clubId ? `orghub-${clubId}` : "orghub")).trim(),
    data: {
      ...(payload.data || {}),
      clubId,
      numer,
      url
    }
  };
}

/******************** PUSH: odbiór i kliknięcie ********************/
async function pullLatestPushMessage_(clubId, numer, minTs) {
  const cid = String(clubId || "").trim();
  const nr = String(numer || "").trim();
  const minTimestamp = Number(minTs || 0);

  if (!cid || !nr) return null;

  let latestMessage = null;

  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      const pullUrl =
        PUSH_CORE + "/push/pull"
        + "?clubId=" + encodeURIComponent(cid)
        + "&numer=" + encodeURIComponent(nr)
        + "&_ts=" + Date.now();

      const pullResp = await fetch(pullUrl, { cache: "no-store" });
      const pullJson = await pullResp.json().catch(() => null);

      if (pullJson && pullJson.success && pullJson.found && pullJson.message) {
        latestMessage = pullJson.message;

        const msgTs = Number(latestMessage.ts || 0);
        if (msgTs > minTimestamp) {
          return latestMessage;
        }
      }
    } catch (e) {
      // następna próba
    }

    if (attempt < 9) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return latestMessage;
}

async function readLastShownPushTs_(clubId, numer) {
  try {
    const cid = String(clubId || "").trim();
    const nr = String(numer || "").trim();
    if (!cid || !nr) return 0;

    const cache = await caches.open("orghub-push-meta");
    const key = `/push-last-shown-${cid}-${nr}.json`;
    const resp = await cache.match(key);
    if (!resp) return 0;

    const json = await resp.json().catch(() => null);
    return Number(json?.ts || 0);
  } catch (e) {
    return 0;
  }
}

async function writeLastShownPushTs_(clubId, numer, ts) {
  try {
    const cid = String(clubId || "").trim();
    const nr = String(numer || "").trim();
    const stamp = Number(ts || 0);
    if (!cid || !nr || !stamp) return;

    const cache = await caches.open("orghub-push-meta");
    const key = `/push-last-shown-${cid}-${nr}.json`;

    await cache.put(
      key,
      new Response(JSON.stringify({ ts: stamp }), {
        headers: { "Content-Type": "application/json" }
      })
    );
  } catch (e) {
    console.warn("writeLastShownPushTs_ error", e);
  }
} 
self.addEventListener("push", (event) => {
  event.waitUntil((async () => {
    let eventPayload = null;
    const meta = await readPushMeta_();

    try {
      eventPayload = event.data ? await event.data.json() : null;
    } catch (e) {
      try {
        eventPayload = event.data ? JSON.parse(event.data.text()) : null;
      } catch (e2) {
        eventPayload = null;
      }
    }

    const routeClubId = String(
      (eventPayload && eventPayload.clubId) ||
      (eventPayload && eventPayload.data && eventPayload.data.clubId) ||
      (meta && meta.clubId) ||
      ""
    ).trim();

    const routeNumer = String(
      (eventPayload && eventPayload.numer) ||
      (eventPayload && eventPayload.data && eventPayload.data.numer) ||
      (meta && meta.numer) ||
      ""
    ).trim();

    let payload = eventPayload;

    if (routeClubId && routeNumer) {
      try {
        const lastShownTs = await readLastShownPushTs_(routeClubId, routeNumer);
        const pulled = await pullLatestPushMessage_(routeClubId, routeNumer, lastShownTs);

        if (pulled && pulled.ts) {
          payload = pulled;
        }
      } catch (e) {
        console.warn("push pullLatest error", e);
      }
    }

    const n = normalizePushPayload_(payload, meta);

    await self.registration.showNotification(n.title, {
      body: n.body,
      icon: n.icon,
      badge: n.badge,
      tag: n.tag,
      data: n.data,
      renotify: true
    });

    try {
      const shownClubId = String(
        (payload && payload.clubId) ||
        (payload && payload.data && payload.data.clubId) ||
        (meta && meta.clubId) ||
        ""
      ).trim();

      const shownNumer = String(
        (payload && payload.numer) ||
        (payload && payload.data && payload.data.numer) ||
        (meta && meta.numer) ||
        ""
      ).trim();

      const shownTs = Number(payload?.ts || 0);

      if (shownClubId && shownNumer && shownTs > 0) {
        await writeLastShownPushTs_(shownClubId, shownNumer, shownTs);
      }
    } catch (e) {
      console.warn("save shown push ts error", e);
    }
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil((async () => {
    const rawUrl =
      event.notification &&
      event.notification.data &&
      event.notification.data.url
        ? String(event.notification.data.url)
        : "";

    const rawClubId =
      event.notification &&
      event.notification.data &&
      event.notification.data.clubId
        ? String(event.notification.data.clubId)
        : "";

    const targetUrl = buildClubPushUrl_(rawClubId, rawUrl);
    const target = new URL(targetUrl, self.location.origin).href;
    const targetOrigin = new URL(target).origin;

    const allClients = await clients.matchAll({ type: "window", includeUncontrolled: true });

    for (const c of allClients) {
      try {
        const clientUrl = new URL(c.url);

        if (clientUrl.origin === targetOrigin) {
          await c.focus();
          if (c.url !== target) {
            await c.navigate(target);
          }
          return;
        }
      } catch (e) {}
    }

    await clients.openWindow(target);
  })());
});
