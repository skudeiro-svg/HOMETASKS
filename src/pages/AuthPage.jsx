import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function AuthPage() {
  const [mode, setMode] = useState('login') // login | register
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', full_name: '' })
  const navigate = useNavigate()

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'register') {
        const { error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { data: { full_name: form.full_name } },
        })
        if (error) throw error
        toast.success('¡Cuenta creada! Revisa tu email para confirmar.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        })
        if (error) throw error
        navigate('/')
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy-800 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🏠</div>
          <h1 className="font-display font-extrabold text-3xl text-gold-400">HomeTasks</h1>
          <p className="text-gray-400 mt-1 text-sm">Gestión de tareas del hogar</p>
        </div>

        <div className="card p-6">
          {/* Tab switch */}
          <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
            {['login', 'register'].map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-all ${
                  mode === m ? 'bg-white shadow text-navy-800' : 'text-gray-500'
                }`}
              >
                {m === 'login' ? 'Iniciar sesión' : 'Registrarse'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
                <input className="input" type="text" value={form.full_name} onChange={set('full_name')} placeholder="Ana García" required />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input className="input" type="email" value={form.email} onChange={set('email')} placeholder="tu@email.com" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input className="input" type="password" value={form.password} onChange={set('password')} placeholder="••••••••" required minLength={6} />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center flex gap-2">
              {loading ? '⏳ Cargando…' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-500 text-xs mt-4">
          Tus datos se guardan de forma segura con Supabase
        </p>
      </div>
    </div>
  )
}
