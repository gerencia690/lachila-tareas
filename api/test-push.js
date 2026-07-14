import webpush from 'web-push'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  })
}

webpush.setVapidDetails(
  'mailto:gerencia@lachila.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const { uid } = req.body
    if (!uid) return res.status(400).json({ error: 'uid requerido' })

    const db = getFirestore()
    const userDoc = await db.collection('users').doc(uid).get()

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Usuario no encontrado en Firestore', uid })
    }

    const data = userDoc.data()
    const subStr = data.pushSubscription

    if (!subStr) {
      return res.status(400).json({
        error: 'Este usuario no tiene suscripción push guardada',
        uid,
        campos: Object.keys(data)
      })
    }

    const sub = typeof subStr === 'string' ? JSON.parse(subStr) : subStr
    const payload = JSON.stringify({
      title: '🔔 Prueba de notificación',
      body: '¡Las notificaciones están funcionando!'
    })

    await webpush.sendNotification(sub, payload)
    res.json({ success: true, endpoint: sub.endpoint?.substring(0, 60) + '...' })
  } catch (e) {
    console.error('Error en test-push:', e)
    res.status(500).json({
      success: false,
      error: e.message,
      statusCode: e.statusCode,
      body: String(e.body || '').substring(0, 300)
    })
  }
}
