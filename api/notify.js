import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'
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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const { taskTitle, assigneeIds, creatorName } = req.body

    const db = getFirestore()
    const messaging = getMessaging()

    // Obtener tokens FCM de los asignados (soporta array y campo único)
    const tokens = []
    for (const uid of assigneeIds) {
      const userDoc = await db.collection('users').doc(uid).get()
      if (userDoc.exists) {
        const data = userDoc.data()
        if (data.fcmTokens && Array.isArray(data.fcmTokens)) {
          tokens.push(...data.fcmTokens)
        } else if (data.fcmToken) {
          tokens.push(data.fcmToken)
        }
      }
    }

    if (tokens.length === 0) {
      return res.json({ success: false, message: 'No hay tokens FCM registrados' })
    }

    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title: '📋 Nueva tarea asignada',
        body: `${taskTitle} — asignada por ${creatorName}`
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'tasks',
          priority: 'high'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            'content-available': 1
          }
        }
      },
      webpush: {
        notification: {
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          vibrate: [200, 100, 200]
        }
      }
    })

    res.json({ success: true, sent: response.successCount, failed: response.failureCount })
  } catch (e) {
    console.error('Error enviando notificación FCM:', e)
    res.status(500).json({ success: false, error: e.message })
  }
}
