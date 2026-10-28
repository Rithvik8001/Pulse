self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function readNotification(event) {
  if (!event.data) return null;
  try {
    const data = event.data.json();
    return data && data.notification ? data.notification : null;
  } catch {
    return null;
  }
}

self.addEventListener("push", (event) => {
  const notification = readNotification(event);
  if (!notification || !notification.title) return;

  event.waitUntil(
    self.registration.showNotification(notification.title, {
      body: notification.body,
      tag: notification.tag,
      lang: notification.lang,
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      data: { navigate: notification.navigate || "/dashboard" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(
    (event.notification.data && event.notification.data.navigate) || "/dashboard",
    self.location.origin,
  ).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const existing = windows.find((client) => new URL(client.url).origin === self.location.origin);
      if (existing) {
        return existing.focus().then((client) => (client ? client.navigate(target) : null));
      }
      return self.clients.openWindow(target);
    }),
  );
});

self.addEventListener("pushsubscriptionchange", (event) => {
  const oldSubscription = event.oldSubscription;
  if (!oldSubscription) return;

  event.waitUntil(
    self.registration.pushManager
      .subscribe(oldSubscription.options)
      .then((subscription) =>
        fetch("/api/push/subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            oldEndpoint: oldSubscription.endpoint,
            subscription: subscription.toJSON(),
          }),
        }),
      ),
  );
});
