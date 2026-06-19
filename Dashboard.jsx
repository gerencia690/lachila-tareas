import { useState, useEffect } from 'react'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { db, auth } from '../firebase'

const STATUS_LABEL = { pending: 'Pendiente', progress: 'En progreso', done: 'Completada' }
const STATUS_CLASS = { pending: 'tag-pending', progress: 'tag-progress', done: 'tag-done' }

function initials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function formatDate(ts) {
  if (!ts) return ''
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
}

function isOverdue(ts, status) {
  if (!ts || status === 'done') return false
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d < new Date()
}

export default function Dashboard({ user, onOpenTask, onNewTask, showToast }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('mine')

  useEffect(() => {
    const q = tab === 'mine'
      ? query(collection(db, 'tasks'), where('assignees', 'array-contains', user.uid), orderBy('createdAt', 'desc'))
      : query(collection(db, 'tasks'), orderBy('createdAt', 'desc'))

    const unsub = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, (err) => {
      console.error(err)
      setLoading(false)
    })
    return unsub
  }, [tab, user.uid])

  const pending = tasks.filter(t => t.status !== 'done').length
  const done = tasks.filter(t => t.status === 'done').length
  const overdue = tasks.filter(t => isOverdue(t.dueDate, t.status)).length

  async function handleLogout() {
    await signOut(auth)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      {/* Header */}
      <div style={{ background: 'var(--brand)', padding: '20px 20px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>Hola,</p>
            <p style={{ color: '#fff', fontSize: '18px', fontWeight: '600' }}>
              {user.displayName || user.email.split('@')[0]} 👋
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ position: 'relative' }}>
              <svg style={{ color: '#fff', width: 24, height: 24 }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {overdue > 0 && (
                <div style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, background: '#EF4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#fff', fontWeight: '700' }}>{overdue}</div>
              )}
            </div>
            <div className="avatar" style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', cursor: 'pointer' }} onClick={handleLogout} title="Cerrar sesión">
              {initials(user.displayName || user.email)}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', padding: '16px 16px 8px' }}>
        <div style={{ background: 'var(--brand-light)', borderRadius: 'var(--radius-sm)', padding: '12px', textAlign: 'center' }}>
          <p style={{ fontSize: '24px', fontWeight: '700', color: 'var(--brand)' }}>{pending}</p>
          <p style={{ fontSize: '11px', color: 'var(--brand-text)' }}>Pendientes</p>
        </div>
        <div style={{ background: 'var(--success-bg)', borderRadius: 'var(--radius-sm)', padding: '12px', textAlign: 'center' }}>
          <p style={{ fontSize: '24px', fontWeight: '700', color: 'var(--success)' }}>{done}</p>
          <p style={{ fontSize: '11px', color: 'var(--success)' }}>Completadas</p>
        </div>
        <div style={{ background: overdue > 0 ? '#FEE2E2' : 'var(--gray-100)', borderRadius: 'var(--radius-sm)', padding: '12px', textAlign: 'center' }}>
          <p style={{ fontSize: '24px', fontWeight: '700', color: overdue > 0 ? '#DC2626' : 'var(--gray-400)' }}>{overdue}</p>
          <p style={{ fontSize: '11px', color: overdue > 0 ? '#DC2626' : 'var(--gray-400)' }}>Vencidas</p>
        </div>
      </div>

      {/* Tabs + nueva tarea */}
      <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={() => setTab('mine')}
          style={{ flex: 1, padding: '8px', borderRadius: 'var(--radius-sm)', border: 'none', fontWeight: '500', fontSize: '13px', cursor: 'pointer', background: tab === 'mine' ? 'var(--brand)' : 'var(--gray-100)', color: tab === 'mine' ? '#fff' : 'var(--gray-600)' }}
        >Mis tareas</button>
        <button
          onClick={() => setTab('all')}
          style={{ flex: 1, padding: '8px', borderRadius: 'var(--radius-sm)', border: 'none', fontWeight: '500', fontSize: '13px', cursor: 'pointer', background: tab === 'all' ? 'var(--brand)' : 'var(--gray-100)', color: tab === 'all' ? '#fff' : 'var(--gray-600)' }}
        >Todas</button>
        <button className="btn btn-brand btn-sm" onClick={onNewTask} style={{ width: 'auto', padding: '8px 16px', fontSize: '13px' }}>
          + Nueva
        </button>
      </div>

      {/* Lista de tareas */}
      <div style={{ padding: '4px 16px 80px', flex: 1, overflowY: 'auto' }}>
        {loading && <div className="spinner" />}
        {!loading && tasks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--gray-400)' }}>
            <p style={{ fontSize: '32px', marginBottom: '12px' }}>✅</p>
            <p style={{ fontWeight: '500' }}>No hay tareas aquí</p>
            <p style={{ fontSize: '14px', marginTop: '6px' }}>Toca "+ Nueva" para crear una</p>
          </div>
        )}
        {tasks.map(task => (
          <div key={task.id} className="card" onClick={() => onOpenTask(task)}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: '600', fontSize: '15px', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {isOverdue(task.dueDate, task.status) && <span style={{ color: '#DC2626' }}>⚠ </span>}
                  {task.title}
                </p>
                {task.description && (
                  <p style={{ fontSize: '13px', color: 'var(--gray-400)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '8px' }}>
                    {task.description}
                  </p>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span className={`tag ${STATUS_CLASS[task.status] || 'tag-pending'}`}>
                    {STATUS_LABEL[task.status] || 'Pendiente'}
                  </span>
                  {task.dueDate && (
                    <span style={{ fontSize: '12px', color: isOverdue(task.dueDate, task.status) ? '#DC2626' : 'var(--gray-400)' }}>
                      📅 {formatDate(task.dueDate)}
                    </span>
                  )}
                  {task.photos?.length > 0 && (
                    <span style={{ fontSize: '12px', color: 'var(--gray-400)' }}>📷 {task.photos.length}</span>
                  )}
                </div>
              </div>
              <svg style={{ width: 18, height: 18, color: 'var(--gray-200)', flexShrink: 0, marginTop: 2 }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom nav */}
      <div className="bottom-nav">
        <button className="nav-item active">
          <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          Panel
        </button>
        <button className="nav-item" onClick={onNewTask}>
          <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
          Nueva
        </button>
        <button className="nav-item" onClick={handleLogout}>
          <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Salir
        </button>
      </div>
    </div>
  )
}
