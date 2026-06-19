import { useState } from 'react'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'

export default function Login() {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password)
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password)
        await updateProfile(cred.user, { displayName: name })
        await setDoc(doc(db, 'users', cred.user.uid), {
          name,
          email,
          createdAt: new Date()
        })
      }
    } catch (err) {
      const msgs = {
        'auth/user-not-found': 'Correo no registrado',
        'auth/wrong-password': 'Contraseña incorrecta',
        'auth/email-already-in-use': 'Este correo ya está registrado',
        'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
        'auth/invalid-email': 'Correo no válido',
        'auth/invalid-credential': 'Correo o contraseña incorrectos'
      }
      setError(msgs[err.code] || 'Error al iniciar sesión')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* Header con logo */}
      <div style={{ background: 'var(--brand)', padding: '52px 28px 40px', textAlign: 'center' }}>
        <svg viewBox="0 0 240 72" width="170" style={{ margin: '0 auto 6px', display: 'block' }} aria-label="LaChila">
          <text x="4" y="56" fontFamily="Georgia, serif" fontSize="56" fontWeight="700" fill="#fff" letterSpacing="-1">LaChila</text>
          <text x="205" y="28" fontFamily="Georgia, serif" fontSize="18" fill="rgba(255,255,255,0.8)">®</text>
        </svg>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', letterSpacing: '1px' }}>PRODUCTOS ALIMENTICIOS</p>
      </div>

      {/* Formulario */}
      <div style={{ padding: '28px 24px', flex: 1 }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '6px' }}>
          {mode === 'login' ? 'Bienvenido' : 'Crear cuenta'}
        </h2>
        <p style={{ color: 'var(--gray-400)', fontSize: '14px', marginBottom: '24px' }}>
          {mode === 'login' ? 'Ingresa tus datos para continuar' : 'Completa los datos del equipo'}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {mode === 'register' && (
            <div>
              <label style={{ fontSize: '13px', color: 'var(--gray-600)', marginBottom: '6px', display: 'block' }}>Nombre completo</label>
              <input
                type="text"
                placeholder="Ej: María García"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
          )}
          <div>
            <label style={{ fontSize: '13px', color: 'var(--gray-600)', marginBottom: '6px', display: 'block' }}>Correo electrónico</label>
            <input
              type="email"
              placeholder="tu@lachila.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label style={{ fontSize: '13px', color: 'var(--gray-600)', marginBottom: '6px', display: 'block' }}>Contraseña</label>
            <input
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '14px' }}>
              {error}
            </div>
          )}

          <button className="btn btn-brand" type="submit" disabled={loading} style={{ marginTop: '8px' }}>
            {loading ? 'Cargando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--gray-600)', marginTop: '24px' }}>
          {mode === 'login' ? '¿Eres nuevo en el equipo? ' : '¿Ya tienes cuenta? '}
          <span
            style={{ color: 'var(--brand)', cursor: 'pointer', fontWeight: '500' }}
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
          >
            {mode === 'login' ? 'Crear cuenta' : 'Inicia sesión'}
          </span>
        </p>
      </div>
    </div>
  )
}
