/* Bazaar service worker — handles Web Push and notification clicks. */

const CACHE_VERSION = 'bazaar-v1';

self.addEventListener('install', (event) => {
  // Activate immediately on first install so push works on next page load.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/**
 * Push payload contract (agreed with backend):
 * {
 *   title: string,
 *   body: string,
 *   url?: string,        // deep link path, e.g. "/orders/123"
 *   tag?: string,        // dedupe key
 *   data?: object        // arbitrary metadata
 * }
 */
self.addEventListener('push', (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (_) {
      payload = { title: 'Bazaar', body: event.data.text() };
    }
  }

  const title = payload.title || 'Bazaar';
  const options = {
    body: payload.body || '',
    icon: '/assets/images/icon.png',
    badge: '/assets/images/icon.png',
    tag: payload.tag,
    data: {
      url: payload.url || '/',
      ...(payload.data || {}),
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientsArr) => {
        // Reuse an existing tab if any.
        for (const client of clientsArr) {
          if ('focus' in client) {
            client.postMessage({ type: 'navigate', url: targetUrl });
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      }),
  );
});
