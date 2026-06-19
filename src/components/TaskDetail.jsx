import { useState, useEffect, useRef } from 'react'
import { doc, updateDoc, onSnapshot, collection, addDoc, query, orderBy, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

const CLOUDINARY_CLOUD = 'dbbkzrz9n'
const CLOUDINARY_PRESET = 'lachila_fotos'

async function uploadToCloudinary(file) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', CLOUDINARY_PRESET)
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
    method: 'POST',
    body: formData
  })
  const data = await res.json()
  if (data.secure_url) return data.secure_url
  throw new Error('Error al subir imagen')
}

const STATUS_OPTS = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'progress', label: 'En progreso' },
  { value: 'done', label: 'Completada' }
]
const STATUS_CLASS = { pending: 'tag-pending', progress: 'tag-progress', done: 'tag-done' }

function initials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function formatDate(ts) {
  if (!ts) return ''
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
}

function formatTime(ts) {
  if (!ts) return ''
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

export default function TaskDetail({ task: initialTask, user, onBack, showToast }) {
  const [task, setTask] = useState(initialTask)
  const [comments, setComments] = useState([])
  const [comment, setComment] = useState('')
  const [uploading, setUploading] = useState(false)
  const [sendingComment, setSendingComment] = useState(false)
  const [lightbox, setLightbox] = useState(null)
  const fileRef = useRef()

  // Escuchar cambios en tiempo real de la tarea
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'tasks', task.id), (snap) => {
      if (snap.exists()) setTask({ id: snap.id, ...snap.data() })
    })
    return unsub
  }, [task.id])

  // Escuchar comentarios en tiempo real
  useEffect(() => {
    const q = query(collection(db, 'tasks', task.id, 'comments'), orderBy('createdAt', 'asc'))
    const unsub = onSnapshot(q, (snap) => {
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [task.id])

  async function changeStatus(newStatus) {
    await updateDoc(doc(db, 'tasks', task.id), { status: newStatus, updatedAt: serverTimestamp() })
    showToast(newStatus === 'done' ? '✅ Tarea completada' : '📝 Estado actualizado')
  }

  async function uploadPhoto(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploading(true)
    try {
      const urls = []
      for (const file of files) {
        const url = await uploadToCloudinary(file)
        urls.push(url)
      }
      const existing = task.photos || []
      await updateDoc(doc(db, 'tasks', task.id), { photos: [...existing, ...urls], updatedAt: serverTimestamp() })
      showToast(`📷 ${urls.length} foto${urls.length > 1 ? 's' : ''} subida${urls.length > 1 ? 's' : ''}`)
    } catch (err) {
      showToast('Error al subir la foto')
      console.error(err)
    }
    setUploading(false)
    e.target.value = ''
  }

  async function sendComment() {
    if (!comment.trim()) return
    setSendingComment(true)
    await addDoc(collection(db, 'tasks', task.id, 'comments'), {
      text: comment.trim(),
      authorId: user.uid,
      authorName: user.displayName || user.email,
      createdAt: serverTimestamp()
    })
    setComment('')
    setSendingComment(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      {/* Header */}
      <div className="header">
        <button className="header-back" onClick={onBack}>←</button>
        <h1>Detalle de tarea</h1>
        {task.status === 'done' && <span style={{ fontSize: '20px' }}>✅</span>}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 100px' }}>
        {/* Título y estado */}
        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '10px', lineHeight: '1.3' }}>{task.title}</h2>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
          <select
            value={task.status || 'pending'}
            onChange={e => changeStatus(e.target.value)}
            style={{ width: 'auto', padding: '6px 10px', fontSize: '13px', fontWeight: '500', border: '1.5px solid var(--brand)', borderRadius: '20px', color: 'var(--brand)', background: 'var(--brand-light)' }}
          >
            {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {task.dueDate && (
            <span style={{ fontSize: '13px', color: 'var(--gray-400)' }}>
              📅 {formatDate(task.dueDate)}
            </span>
          )}
        </div>

        {/* Descripción */}
        {task.description && (
          <>
            <p className="section-label">Descripción</p>
            <p style={{ fontSize: '15px', color: 'var(--gray-600)', lineHeight: '1.6', marginBottom: '20px' }}>{task.description}</p>
          </>
        )}

        {/* Asignados */}
        {task.assigneeNames?.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <p className="section-label">Asignado a</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {task.assigneeNames.map((name, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--brand-light)', borderRadius: '20px', padding: '4px 12px 4px 4px' }}>
                  <div className="avatar" style={{ width: 28, height: 28, fontSize: '11px' }}>{initials(name)}</div>
                  <span style={{ fontSize: '13px', color: 'var(--brand-text)' }}>{name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="divider" />

        {/* Fotos de evidencia */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <p className="section-label" style={{ margin: 0 }}>📷 Fotos de evidencia ({task.photos?.length || 0})</p>
            <button
              className="btn btn-outline btn-sm"
              style={{ width: 'auto' }}
              onClick={() => fileRef.current.click()}
              disabled={uploading}
            >
              {uploading ? 'Subiendo...' : '+ Foto'}
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            style={{ display: 'none' }}
            onChange={uploadPhoto}
          />
          {task.photos?.length > 0 ? (
            <div className="photo-grid">
              {task.photos.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`Evidencia ${i + 1}`}
                  className="photo-thumb"
                  onClick={() => setLightbox(url)}
                />
              ))}
            </div>
          ) : (
            <div style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)', padding: '20px', textAlign: 'center', color: 'var(--gray-400)', fontSize: '14px' }}>
              Sin fotos aún — toca "+ Foto" para agregar evidencia
            </div>
          )}
        </div>

        <div className="divider" />

        {/* Comentarios */}
        <div>
          <p className="section-label">💬 Comentarios ({comments.length})</p>
          {comments.map(c => (
            <div key={c.id} className="comment">
              <div className="avatar" style={{ width: 30, height: 30, fontSize: '11px' }}>{initials(c.authorName)}</div>
              <div className="comment-bubble">
                <p className="author">{c.authorName}</p>
                <p>{c.text}</p>
                {c.createdAt && <p className="time">{formatTime(c.createdAt)}</p>}
              </div>
            </div>
          ))}
          {comments.length === 0 && (
            <p style={{ color: 'var(--gray-400)', fontSize: '14px', marginBottom: '12px' }}>Sin comentarios aún</p>
          )}
        </div>
      </div>

      {/* Input de comentario fijo abajo */}
      <div style={{ position: 'sticky', bottom: 0, background: '#fff', borderTop: '1px solid var(--gray-200)', padding: '12px 16px', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
        <div className="avatar" style={{ width: 30, height: 30, fontSize: '11px', flexShrink: 0 }}>
          {initials(user.displayName || user.email)}
        </div>
        <textarea
          placeholder="Escribe un comentario..."
          value={comment}
          onChange={e => setComment(e.target.value)}
          style={{ flex: 1, minHeight: 42, maxHeight: 120, fontSize: '14px', padding: '10px 12px' }}
          rows={1}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendComment() } }}
        />
        <button
          className="btn btn-brand"
          style={{ width: 'auto', padding: '10px 16px', flexShrink: 0 }}
          onClick={sendComment}
          disabled={!comment.trim() || sendingComment}
        >
          {sendingComment ? '...' : '↑'}
        </button>
      </div>

      {/* Lightbox fotos */}
      {lightbox && (
        <div className="img-overlay" onClick={() => setLightbox(null)}>
          <button className="img-overlay-close" onClick={() => setLightbox(null)}>✕</button>
          <img src={lightbox} alt="Evidencia" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  )
}
