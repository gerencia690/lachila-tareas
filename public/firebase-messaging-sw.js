importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: "AIzaSyBy3OGmMl9FqjF6hiJSrnc6tn7p8MOSr84",
  authDomain: "lachila-tareas.firebaseapp.com",
  projectId: "lachila-tareas",
  storageBucket: "lachila-tareas.firebasestorage.app",
  messagingSenderId: "264771001675",
  appId: "1:264771001675:web:01a239c6f724387d269cce"
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification
  self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: payload.data
  })
})
