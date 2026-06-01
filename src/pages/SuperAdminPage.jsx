import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Trash2, RefreshCw, LogOut, ShieldAlert } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

const SUPERADMIN_EMAIL = 'skudeiro@gmail.com'

export default function SuperAdminPage() {
  const [step, setStep] = useState('login') // login | panel
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)
  const [tab, setTab] = useState('households')
  const [households, setHouseholds] = useState([])
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) return toast.error('Rellena todos los campos')
    if (email !== SUPERADMIN_EMAIL) return toast.error('Acceso denegado')
    setLoggingIn(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoggingIn(false)
    if (error) return toast.error('Credenciales incorrectas')
    setStep('panel')
    load()
  }

  const load = async () => {
    setLoading(true)
    const [{ data: h }, { data: u }, { data: l }] = await Promise.all([
      supabase.from('households').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*, households(name)').order('created_at', { ascending: false }),
      supabase.from('admin_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ])
    setHouseholds(h || [])
    setUsers(u || [])
    setLogs(l || [])

    const { count: totalHouseholds } = await supabase.from('households').select('*', { count: 'exact', head: true })
    const { count: totalUsers }      = await supabase.from('profiles').select('*', { count: 'exact', head: true })
    const { count: totalTasks }      = await supabase.from('task_assignments').select('*', { count: 'exact', head: true })
    const { count: validated }       = await supabase.from('task_assignments').select('*', { count: 'exact', head: true }).eq('status', 'validated')
    const { count: pending }         = await supabase.from('households').select('*', { count: 'exact', head: true }).eq('status', 'pending')
    setStats({ totalHouseholds, totalUsers, totalTasks, validated, pending })
    setLoading(false)
  }

  const logAction = async (action, targetType, targetId, details) => {
    await supabase.from('admin_logs').insert({
      action, target_type: targetType, target_id: targetId,
      details, performed_by: SUPERADMIN_EMAIL
    })
  }

  const approveHousehold = async (id, name) => {
    const { error } = await supabase.from('households').update({ status: 'approved' }).eq('id', id)
    if (error) return toast.error(error.message)
    await logAction('approve_household', 'household', id, { name })
    toast.success(`✅ "${name}" aprobado`)
    load()
  }

  const suspendHousehold = async (id, name) => {
    if (!confirm(`¿Suspender "${name}"?`)) return
    const { error } = await supabase.from('households').update({ status: 'suspended' }).eq('id', id)
    if (error) return toast.error(error.message)
    await logAction('suspend_household', 'household', id, { name })
    toast.success(`"${name}" suspendido`)
    load()
  }

  const deleteHousehold = async (id, name) => {
    if (!confirm(`¿ELIMINAR "${name}"? No se puede deshacer.`)) return
    const { error } = await supabase.from('households').delete().eq('id', id)
    if (error) return toast.error(error.message)
    await logAction('delete_household', 'household', id, { name })
    toast.success('Hogar eliminado')
    load()
  }

  const changeUserRole = async (userId, newRole, name) => {
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    if (error) return toast.error(error.message)
    await logAction('change_role', 'profile', userId, { name, newRole })
    toast.success('Rol actualizado')
    load()
  }

  const deleteUser = async (userId, name) => {
    if (!confirm(`¿Eliminar a "${name}"?`)) return
    const { error } = await supabase.from('profiles').delete().eq('id', userId)
    if (error) return toast.error(error.message)
    await logAction('delete_user', 'profile', userId, { name })
    toast.success('Usuario eliminado')
    load()
  }

  const STATUS_COLORS = {
    approved:  'bg-green-900 text-green-300',
    pending:   'bg-yellow-900 text-yellow-300',
    suspended: 'bg-red-900 text-red-300',
  }

  // Login screen
  if (step === 'login') return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <Toaster />
      <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-sm border border-gray-800">
        <div className="flex items-center gap-2 mb-6">
          <ShieldAlert className="text-red-400" size={22} />
          <h1 className="font-bold text-white text-lg">SuperAdmin</h1>
          <span className="text-xs bg-red-900 text-red-300 px-2 py-0.5 rounded-full">BACKEND</span>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Email</label>
            <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500"
              type="email" placeholder="admin@email.com" value={email}
              onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Contraseña</label>
            <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500"
              type="password" placeholder="••••••••" value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()} />
          </div>
          <button onClick={handleLogin} disabled={loggingIn}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50">
            {loggingIn ? 'Verificando…' : 'Acceder al panel'}
          </button>
        </div>
      </div>
    </div>
  )

  // Panel
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Toaster />
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldAlert className="text-red-400" size={22} />
          <span className="font-bold text-lg">SuperAdmin</span>
          <span className="text-xs bg-red-900 text-red-300 px-2 py-0.5 rounded-full">BACKEND</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} className="text-gray-400 hover:text-white"><RefreshCw size={16} /></button>
          <button onClick={() => { supabase.auth.signOut(); setStep('login') }}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white">
            <LogOut size={15} /> Salir
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Hogares',    value: stats.totalHouseholds, color: 'text-blue-400'    },
              { label: 'Pendientes', value: stats.pending,         color: 'text-yellow-400'  },
              { label: 'Usuarios',   value: stats.totalUsers,      color: 'text-purple-400'  },
              { label: 'Tareas',     value: stats.totalTasks,      color: 'text-green-400'   },
              { label: 'Validadas',  value: stats.validated,       color: 'text-emerald-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <div className={`font-bold text-2xl ${color}`}>{value ?? '…'}</div>
                <div className="text-xs text-gray-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-1 bg-gray-900 rounded-lg p-1 border border-gray-800">
          {[['households','🏠 Hogares'],['users','👥 Usuarios'],['logs','📋 Logs']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
                tab === id ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {loading && <div className="text-gray-500 text-center py-10">Cargando…</div>}

        {!loading && tab === 'households' && (
          <div className="space-y-3">
            {households.map(h => (
              <div key={h.id} className="bg-gray-900 rounded-xl p-4 border border-gray-800 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{h.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[h.status] || 'bg-gray-700 text-gray-300'}`}>
                      {h.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">🔑 {h.invite_code} · 📅 {h.created_at?.split('T')[0]}</div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {h.status !== 'approved' && (
                    <button onClick={() => approveHousehold(h.id, h.name)}
                      className="text-xs bg-green-900 text-green-300 hover:bg-green-800 px-3 py-1.5 rounded-lg">
                      ✅ Aprobar
                    </button>
                  )}
                  {h.status === 'approved' && (
                    <button onClick={() => suspendHousehold(h.id, h.name)}
                      className="text-xs bg-yellow-900 text-yellow-300 hover:bg-yellow-800 px-3 py-1.5 rounded-lg">
                      ⏸ Suspender
                    </button>
                  )}
                  <button onClick={() => deleteHousehold(h.id, h.name)}
                    className="text-gray-600 hover:text-red-400 p-1.5">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            {!households.length && <p className="text-gray-600 text-center py-8">Sin hogares</p>}
          </div>
        )}

        {!loading && tab === 'users' && (
          <div className="space-y-3">
            {users.map(u => (
              <div key={u.id} className="bg-gray-900 rounded-xl p-4 border border-gray-800 flex items-center gap-4">
                <span className="text-2xl">{u.avatar_emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{u.full_name}</div>
                  <div className="text-xs text-gray-500">🏠 {u.households?.name || 'Sin hogar'} · ⭐ {u.points} pts</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select value={u.role} onChange={e => changeUserRole(u.id, e.target.value, u.full_name)}
                    className="text-xs bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-gray-300 focus:outline-none">
                    <option value="aprendiz">🌱 Aprendiz</option>
                    <option value="maestro">⭐ Maestro</option>
                    <option value="admin">👑 Admin</option>
                  </select>
                  <button onClick={() => deleteUser(u.id, u.full_name)}
                    className="text-gray-600 hover:text-red-400 p-1.5">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            {!users.length && <p className="text-gray-600 text-center py-8">Sin usuarios</p>}
          </div>
        )}

        {!loading && tab === 'logs' && (
          <div className="space-y-2">
            {logs.map(l => (
              <div key={l.id} className="bg-gray-900 rounded-lg p-3 border border-gray-800 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-mono text-yellow-400">{l.action}</span>
                  <span className="text-xs text-gray-500 ml-2">{JSON.stringify(l.details)}</span>
                </div>
                <span className="text-xs text-gray-600 shrink-0">{l.created_at?.split('T')[0]}</span>
              </div>
            ))}
            {!logs.length && <p className="text-gray-600 text-center py-8">Sin actividad</p>}
          </div>
        )}
      </div>
    </div>
  )
}
