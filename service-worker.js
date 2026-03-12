var CACHE = 'void-v1';
var STATIC = ['/', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', function(e) {
  e.waitUntil(caches.open(CACHE).then(function(c) { return c.addAll(STATIC); }));
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', function(e) {
  if (e.request.url.includes('/api/')) return;
  e.respondWith(fetch(e.request).catch(function() { return caches.match(e.request); }));
});

self.addEventListener('push', function(e) {
  e.waitUntil(
    fetch('/api/push/latest')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        return self.registration.showNotification(data.username + ' in void.chat', {
          body: (data.message || 'new message').slice(0, 100),
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: 'void-msg',
          renotify: true,
          vibrate: [100, 50, 100],
          data: { url: '/' }
        });
      })
      .catch(function() {
        return self.registration.showNotification('void.chat', {
          body: 'new message',
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: 'void-msg',
          data: { url: '/' }
        });
      })
  );
});

self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list) {
      for (var i = 0; i < list.length; i++) {
        if ('focus' in list[i]) return list[i].focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});
