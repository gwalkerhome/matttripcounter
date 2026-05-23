// ==============================================
// SW.JS  —  Service Worker
// ==============================================
// This runs in the background and enables the app
// to receive notifications even when not open.
// Currently handles: install, activate, and
// notification click (opens the app).
// Ready to be extended with push notifications
// once a server is added in future.

const CACHE_NAME = 'matts-journey-v2';

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

// Handle a notification being tapped — opens the app
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(clientList => {
            // If app is already open, focus it
            for (const client of clientList) {
                if ('focus' in client) return client.focus();
            }
            // Otherwise open it
            return clients.openWindow('./');
        })
    );
});

// Handle push events (for future server-sent notifications)
self.addEventListener('push', (event) => {
    if (!event.data) return;
    const data = event.data.json();
    event.waitUntil(
        self.registration.showNotification(data.title || "Matt's Journey", {
            body:  data.body  || '',
            icon:  'assets/icon.png',
            badge: 'assets/icon.png',
            tag:   data.tag   || 'matts-journey'
        })
    );
});
