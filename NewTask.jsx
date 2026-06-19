import { useState, useEffect } from 'react'
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase'

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
      // Pre-seleccionar al usuario actual si no está en la lista
      const me = list.find(u => u.id === user.uid)
      if (me) {
        setSelected([me.id])
        setSelectedNames([me.name])
      }
    })
  }, [user])

  function toggleUser(u) {
    if (selected.includes(u.id)) {
      if (selected.length === 1) return // al menos uno siempre
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
        {/* Título */}
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

        {/* Descripción */}
        <div>
          <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--gray-600)', display: 'block', marginBottom: '6px' }}>Descripción</label>
          <textarea
            placeholder="Más detalles sobre esta tarea..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        {/* Fecha límite */}
        <div>
          <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--gray-600)', display: 'block', marginBottom: '6px' }}>📅 Fecha límite</label>
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            min={today}
          />
        </div>

        {/* Asignar a */}
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

      {/* Botón fijo abajo */}
      <div style={{ position: 'sticky', bottom: 0, padding: '16px', background: '#fff', borderTop: '1px solid var(--gray-200)' }}>
        <button className="btn btn-brand" onClick={handleSubmit} disabled={loading || !title.trim()}>
          {loading ? 'Creando...' : 'Crear tarea'}
        </button>
      </div>
    </div>
  )
}
