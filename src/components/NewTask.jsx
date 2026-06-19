import { useState, useEffect } from 'react'
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase'

const ONESIGNAL_APP_ID = '35eed05c-9dc4-4f8a-ac58-e723e383b5be'
const ONESIGNAL_REST_KEY = 'os_v2_app_gxxnaxe5yrhyvlcy44r6ha5vxzjhkk22f5lucg4zdoo7aqrgwwy4srggvkiefoljldzn4fgyr3qubaqiquixjxdnynjpcmbi7jtg66i'

async function sendPushToAssignees(taskTitle, assigneeIds, creatorName) {
  try {
    await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_KEY}`
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_aliases: { external_id: assigneeIds },
        target_channel: 'push',
        headings: { es: '📋 Nueva tarea asignada', en: '📋 New task assigned' },
        contents: { es: `${taskTitle} — asignada por ${creatorName}`, en: `${taskTitle} — assigned by ${creatorName}` }
      })
    })
  } catch (e) {
    console.log('Error enviando notificación push:', e)
  }
}

export default function NewTask({ user, onBack, showToast }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [users, setUsers] = useState([])
  const [selected, setSelected] = useState([user.uid])
  const [selectedNames, setSelectedNames] = useState([user.displayName || user.email])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getDocs(query(collection(db, 'users'), orderBy('name'))).then(snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setUsers(list)
      const me = list.find(u => u.id === user.uid)
      if (me) {
        setSelected([me.id])
        setSelectedNames([me.name])
      }
    })
  }, [user])

  function toggleUser(u) {
    if (selected.includes(u.id)) {
      if (selected.length === 1) return
      setSelected(s => s.filter(id => id !== u.id))
      setSelectedNames(n => n.filter(name => name !== u.name))
    } else {
      setSelected(s => [...s, u.id])
      setSelectedNames(n => [...n, u.name])
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    try {
      await addDoc(collection(db, 'tasks'), {
        title: title.trim(),
        description: description.trim(),
        status: 'pending',
        assignees: selected,
        assigneeNames: selectedNames,
        createdBy: user.uid,
        createdByName: user.displayName || user.email,
        dueDate: dueDate ? new Date(dueDate + 'T23:59:59') : null,
        photos: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      // Notificar a los asignados (excepto al creador)
      const toNotify = selected.filter(id => id !== user.uid)
      if (toNotify.length > 0) {
        await sendPushToAssignees(title.trim(), toNotify, user.displayName || user.email)
      }

      showToast('✅ Tarea creada correctamente')
      onBack()
    } catch (err) {
      showToast('Error al crear la tarea')
      console.error(err)
    }
    setLoading(false)
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <div className="header">
        <button className="header-back" onClick={onBack}>←</button>
        <h1>Nueva tarea</h1>
      </div>

      <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 100px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div>
          <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--gray-600)', display: 'block', marginBottom: '6px' }}>Título *</label>
          <input
            type="text"
            placeholder="¿Qué hay que hacer?"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div>
          <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--gray-600)', display: 'block', marginBottom: '6px' }}>Descripción</label>
          <textarea
            placeholder="Más detalles sobre esta tarea..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div>
          <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--gray-600)', display: 'block', marginBottom: '6px' }}>📅 Fecha límite</label>
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            min={today}
          />
        </div>

        <div>
          <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--gray-600)', display: 'block', marginBottom: '10px' }}>👥 Asignar a</label>
          {users.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--gray-400)' }}>
              Solo tú por ahora. El resto del equipo aparecerá aquí cuando creen su cuenta.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {users.map(u => (
                <div
                  key={u.id}
                  onClick={() => toggleUser(u)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px', borderRadius: 'var(--radius-sm)',
                    border: `1.5px solid ${selected.includes(u.id) ? 'var(--brand)' : 'var(--gray-200)'}`,
                    background: selected.includes(u.id) ? 'var(--brand-light)' : '#fff',
                    cursor: 'pointer'
                  }}
                >
                  <div className="avatar">{u.name?.[0]?.toUpperCase() || '?'}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '14px', fontWeight: '500' }}>{u.name}</p>
                    <p style={{ fontSize: '12px', color: 'var(--gray-400)' }}>{u.email}</p>
                  </div>
                  {selected.includes(u.id) && (
                    <span style={{ color: 'var(--brand)', fontSize: '18px' }}>✓</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </form>

      <div style={{ position: 'sticky', bottom: 0, padding: '16px', background: '#fff', borderTop: '1px solid var(--gray-200)' }}>
        <button className="btn btn-brand" onClick={handleSubmit} disabled={loading || !title.trim()}>
          {loading ? 'Creando...' : 'Crear tarea'}
        </button>
      </div>
    </div>
  )
}
