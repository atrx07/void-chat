// void.chat service worker

var CACHE = ‘void-v1’;
var STATIC = [’/’, ‘/manifest.json’, ‘/icon-192.png’, ‘/icon-512.png’];

self.addEventListener(‘install’, function(e) {
e.waitUntil(caches.open(CACHE).then(function(c) { return c.addAll(STATIC); }));
self.skipWaiting();
});

self.addEventListener(‘activate’, function(e) {
e.waitUntil(clients.claim());
});

self.addEventListener(‘fetch’, function(e) {
// Network first for API calls
if (e.request.url.includes(’/api/’)) return;
e.respondWith(
fetch(e.request).catch(function() {
return caches.match(e.request);
})
);
});

self.addEventListener(‘push’, function(e) {
if (!e.data) return;
var data = e.data.json();
e.waitUntil(
self.registration.showNotification(data.title || ‘void.chat’, {
body: data.body || ‘’,
icon: ‘/icon-192.png’,
badge: ‘/icon-192.png’,
tag: ‘void-msg’,
renotify: true,
vibrate: [100, 50, 100],
data: { url: ‘/’ }
})
);
});

self.addEventListener(‘notificationclick’, function(e) {
e.notification.close();
e.waitUntil(
clients.matchAll({ type: ‘window’, includeUncontrolled: true }).then(function(list) {
for (var i = 0; i < list.length; i++) {
if (list[i].url === ‘/’ && ‘focus’ in list[i]) return list[i].focus();
}
if (clients.openWindow) return clients.openWindow(’/’);
})
);
});
