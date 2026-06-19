import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: "AIzaSyBy3OGmMl9FqjF6hiJSrnc6tn7p8MOSr84",
  authDomain: "lachila-tareas.firebaseapp.com",
  projectId: "lachila-tareas",
  storageBucket: "lachila-tareas.firebasestorage.app",
  messagingSenderId: "264771001675",
  appId: "1:264771001675:web:01a239c6f724387d269cce"
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)

let messaging = null
try {
  messaging = getMessaging(app)
} catch (e) {
  console.log('Mensajería no disponible en este navegador')
}
export { messaging }

// VAPID key — reemplazar con la clave de Firebase Console > Project Settings > Cloud Messaging > Web Push certificates
export const VAPID_KEY = 'TU_VAPID_KEY_AQUI'

export async function requestNotificationPermission() {
  if (!messaging) return null
  try {
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      const token = await getToken(messaging, { vapidKey: VAPID_KEY })
      return token
    }
  } catch (e) {
    console.log('Error al obtener permiso de notificación:', e)
  }
  return null
}

export function onForegroundMessage(callback) {
  if (!messaging) return () => {}
  return onMessage(messaging, callback)
}
