const CACHE_NAME = "mwc-vertrieb-pwa-v74";
const APP_SHELL = [
  "/vertrieb",
  "/vertrieb-pwa.css?v=20260801-v74",
  "/vertrieb-pwa.js?v=20260801-v74",
  "/assets/pwa-vertrieb-icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data?.json() || {}; } catch (_error) { payload = { body: event.data?.text?.() || "" }; }
  const title = String(payload?.title || "my-waycard CRM").trim() || "my-waycard CRM";
  const body = String(payload?.body || "Du hast eine neue Nachricht.").trim();
  const unreadCount = Math.max(0, Number(payload?.unreadCount || 0) || 0);
  const options = {
    body,
    icon: "/assets/pwa-vertrieb-icon.svg",
    badge: "/assets/pwa-vertrieb-icon.svg",
    tag: String(payload?.tag || "employee-message").trim() || "employee-message",
    renotify: true,
    data: { url: "/vertrieb" },
  };
  const tasks = [self.registration.showNotification(title, options)];
  if ("setAppBadge" in self.navigator) tasks.push(self.navigator.setAppBadge(unreadCount || 1));
  event.waitUntil(Promise.all(tasks));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(String(event.notification?.data?.url || "/vertrieb"), self.location.origin).href;
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = clients.find((client) => client.url.startsWith(self.location.origin));
    if (existing) return existing.focus();
    return self.clients.openWindow(targetUrl);
  })());
});
