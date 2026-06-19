import { useState, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, requestNotificationPermission, onForegroundMessage } from './firebase'
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
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      if (u) {
        requestNotificationPermission().then(token => {
          if (token) console.log('FCM token obtenido')
        })
      }
    })
    return unsub
  }, [])

  useEffect(() => {
    const unsub = onForegroundMessage((payload) => {
      showToast(`🔔 ${payload.notification?.title}: ${payload.notification?.body}`)
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
