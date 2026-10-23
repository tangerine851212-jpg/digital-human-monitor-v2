self.addEventListener("push", (event) => {
  let data = {
    title: "安智伴 家人连线台",
    body: "收到一条新的家人留言。",
    url: "/",
    icon: "/pwa/icon-192x192.webp",
    badge: "/pwa/badge-96x96.webp",
    tag: "digital-human-message",
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data = { ...data, body: event.data.text() };
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: data.tag,
      data: {
        url: data.url,
      },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  const targetUrl = new URL(
    event.notification.data?.url || "/",
    self.location.origin,
  ).toString();

  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(
      async (clientList) => {
        for (const client of clientList) {
          if (!("focus" in client)) {
            continue;
          }

          if (client.url === targetUrl) {
            return client.focus();
          }

          if (client.url.startsWith(self.location.origin) && "navigate" in client) {
            await client.navigate(targetUrl);
            return client.focus();
          }
        }

        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }

        return undefined;
      },
    ),
  );
});
