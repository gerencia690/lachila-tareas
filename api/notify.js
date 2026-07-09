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
    const { taskTitle, assigneeIds, creatorName } = req.body
    const db = getFirestore()

    const payload = JSON.stringify({
      title: '📋 Nueva tarea asignada',
      body: `${taskTitle} — asignada por ${creatorName}`
    })

    let sent = 0
    let failed = 0

    for (const uid of assigneeIds) {
      const userDoc = await db.collection('users').doc(uid).get()
      if (!userDoc.exists) continue

      const data = userDoc.data()
      const subscriptions = []

      // Suscripciones nativas Web Push (nuevo formato)
      if (data.pushSubscriptions && Array.isArray(data.pushSubscriptions)) {
        subscriptions.push(...data.pushSubscriptions)
      }
      if (data.pushSubscription) {
        subscriptions.push(data.pushSubscription)
      }

      for (const subStr of subscriptions) {
        try {
          const sub = typeof subStr === 'string' ? JSON.parse(subStr) : subStr
          await webpush.sendNotification(sub, payload)
          sent++
        } catch (e) {
          console.log('Error enviando push:', e.statusCode, e.body)
          failed++
        }
      }
    }

    res.json({ success: true, sent, failed })
  } catch (e) {
    console.error('Error en notify:', e)
    res.status(500).json({ success: false, error: e.message })
  }
}
