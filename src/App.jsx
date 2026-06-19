import { useState, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import TaskDetail from './components/TaskDetail'
import NewTask from './components/NewTask'

const ONESIGNAL_APP_ID = '35eed05c-9dc4-4f8a-ac58-e723e383b5be'

export default function App() {
  const [user, setUser] = useState(undefined)
  const [view, setView] = useState('dashboard')
  const [selectedTask, setSelectedTask] = useState(null)
  const [toast, setToast] = useState(null)

  // Inicializar OneSignal (cargado via CDN en index.html)
  useEffect(() => {
    window.OneSignalDeferred = window.OneSignalDeferred || []
    window.OneSignalDeferred.push(async function(OneSignal) {
      await OneSignal.init({
        appId: ONESIGNAL_APP_ID,
        notifyButton: { enable: false },
      })
      OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
        event.preventDefault()
        showToast(`🔔 ${event.notification.title}`)
      })
    })
  }, [])

  // Auth + vincular usuario a OneSignal
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        window.OneSignalDeferred = window.OneSignalDeferred || []
        window.OneSignalDeferred.push(async function(OneSignal) {
          try {
            await OneSignal.login(u.uid)
            await OneSignal.Slidedown.promptPush()
          } catch (e) {
            console.log('OneSignal login error:', e)
          }
        })
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
