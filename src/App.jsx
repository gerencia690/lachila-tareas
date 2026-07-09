import { useState, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, setDoc, arrayUnion } from 'firebase/firestore'
import { auth, db, requestNotificationPermission } from './firebase'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import TaskDetail from './components/TaskDetail'
import NewTask from './components/NewTask'

export default function App() {
  const [user, setUser] = useState(undefined)
  const [view, setView] = useState('dashboard')
  const [selectedTask, setSelectedTask] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        // Registrar suscripción push y guardarla en Firestore
        try {
          const subscription = await requestNotificationPermission()
          if (subscription) {
            // Guardar como array para soportar múltiples dispositivos por usuario
            await setDoc(
              doc(db, 'users', u.uid),
              { pushSubscriptions: arrayUnion(subscription) },
              { merge: true }
            )
          }
        } catch (e) {
          console.log('Push error:', e)
        }
      }
    })
    return unsub
  }, [])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3100)
  }

  function openTask(task) {
    setSelectedTask(task)
    setView('task')
  }

  function goBack() {
    setView('dashboard')
    setSelectedTask(null)
  }

  if (user === undefined) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100dvh' }}>
        <div className="spinner" />
      </div>
    )
  }

  if (!user) return <Login />

  return (
    <>
      {toast && <div className="toast">{toast}</div>}
      {view === 'dashboard' && (
        <Dashboard
          user={user}
          onOpenTask={openTask}
          onNewTask={() => setView('new-task')}
          showToast={showToast}
        />
      )}
      {view === 'task' && (
        <TaskDetail
          task={selectedTask}
          user={user}
          onBack={goBack}
          showToast={showToast}
        />
      )}
      {view === 'new-task' && (
        <NewTask
          user={user}
          onBack={goBack}
          showToast={showToast}
        />
      )}
    </>
  )
}
