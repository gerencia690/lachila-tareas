import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

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

// Clave pública VAPID para Web Push (funciona en Android e iOS 16.4+ como PWA)
const VAPID_PUBLIC_KEY = 'BFsfyUIZuKrlBpjUa3KM2zk2CKA2zh41h5k_FfS3c2QG0lPEyktrofrmxkBSL6rkmnWbDzdyL-uMxD-OFEwOtj4'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export async function requestNotificationPermission() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push no soportado en este navegador')
      return null
    }

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.log('Permiso denegado')
      return null
    }

    // Usar el service worker activo (el que registra vite-plugin-pwa)
    const swRegistration = await navigator.serviceWorker.ready

    // Verificar si ya hay suscripción activa
    let subscription = await swRegistration.pushManager.getSubscription()
    if (!subscription) {
      subscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      })
    }

    return JSON.stringify(subscription)
  } catch (e) {
    console.log('Error al suscribirse a push:', e)
    return null
  }
}
