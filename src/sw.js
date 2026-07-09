import { precacheAndRoute } from 'workbox-precaching'

// Inyectado por vite-plugin-pwa en build
precacheAndRoute(self.__WB_MANIFEST || [])

// Manejar notificaciones push nativas (funciona en Android e iOS PWA)
self.addEventListener('push', event => {
  if (!event.data) return
  let data = {}
  try {
    data = event.data.json()
  } catch (e) {
    data = { title: 'Nueva tarea', body: event.data.text() }
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Nueva tarea', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      tag: 'task-notification',
      requireInteraction: false
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if ('focus' in client) return client.focus()
      }
      return clients.openWindow('/')
    })
  )
})
