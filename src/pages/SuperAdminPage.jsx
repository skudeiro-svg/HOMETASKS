import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { CheckCircle, XCircle, Trash2, RefreshCw, LogOut, Users, Home, ClipboardList, ShieldAlert } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

export default function SuperAdminPage() {
  const { signOut } = useAuthStore()
  const navigate = useNavigate()
  const [tab, setTab] = useState('households')
  const [households, setHouseholds] = useState([])
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const [{ data: h }, { data: u }, { data: l }] = await Promise.all([
      supabase.from('households').select('*, profiles(count)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*, households(name)').order('created_at', { ascending: false }),
      supabase.from('admin_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ])
    setHouseholds(h || [])
    setUsers(u || [])
    setLogs(l || [])

    // Stats
    const { count: totalHouseholds } = await supabase.from('households').select('*', { count: 'exact', head: true })
    const { count: totalUsers }      = await supabase.from('profiles').select('*', { count: 'exact', head: true })
    const { count: totalTasks }      = await supabase.from('task_assignments').select('*', { count: 'exact', head: true })
    const { count: validated }       = await supabase.from('task_assignments').select('*', { count: 'exact', head: true }).eq('status', 'validated')
    const { count: pending }         = await supabase.from('households').select('*', { count: 'exact', head: true }).eq('status', 'pending')
    setStats({ totalHouseholds, totalUsers, totalTasks, validated, pending })
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const logAction = async (action, targetType, targetId, details) => {
    await supabase.from('admin_logs').insert({
      action, target_type: targetType, target_id: targetId,
      details, performed_by: 'skudeiro@gmail.com'
    })
  }

  const approveHousehold = async (id, name) => {
    const { error } = await supabase.from('households').update({ status: 'approved' }).eq('id', id)
    if (error) return toast.error(error.message)
    await logAction('approve_household', 'household', id, { name })
    toast.success(`✅ Hogar "${name}" aprobado`)
    load()
  }

  const suspendHousehold = async (id, name) => {
    if (!confirm(`¿Suspender el hogar "${name}"?`)) return
    const { error } = await supabase.from('households').update({ status: 'suspended' }).eq('id', id)
    if (error) return toast.error(error.message)
    await logAction('suspend_household', 'household', id, { name })
    toast.success(`Hogar "${name}" suspendido`)
    load()
  }

  const deleteHousehold = async (id, name) => {
    if (!confirm(`¿ELIMINAR el hogar "${name}"? Esta acción no se puede deshacer.`)) return
    const { error } = await supabase.from('households').delete().eq('id', id)
    if (error) return toast.error(error.message)
    await logAction('delete_household', 'household', id, { name })
    toast.success(`Hogar "${name}" eliminado`)
    load()
  }

  const changeUserRole = async (userId, newRole, name) => {
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    if (error) return toast.error(error.message)
    await logAction('change_role', 'profile', userId, { name, newRole })
    toast.success(`Rol de ${name} cambiado a ${newRole}`)
    load()
  }

  const deleteUser = async (userId, name) => {
    if (!confirm(`¿Eliminar al usuario "${name}"?`)) return
    const { error } = await supabase.from('profiles').delete().eq('id', userId)
    if (error) return toast.error(error.message)
    await logAction('delete_user', 'profile', userId, { name })
    toast.success(`Usuario "${name}" eliminado`)
    load()
  }

  const STATUS_COLORS = {
    approved:  'bg-green-100 text-green-700',
    pending:   'bg-yellow-100 text-yellow-700',
    suspended: 'bg-red-100 text-red-700',
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldAlert className="text-red-400" size={22} />
          <span className="font-display font-bold text-lg">SuperAdmin Panel</span>
          <span className="text-xs bg-red-900 text-red-300 px-2 py-0.5 rounded-full">BACKEND</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} className="text-gray-400 hover:text-white transition-colors">
            <RefreshCw size={16} />
          </button>
          <button onClick={() => { signOut(); navigate('/auth') }}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
            <LogOut size={15} /> Salir
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Hogares',    value: stats.totalHouseholds, icon: Home,          color: 'text-blue-400'   },
              { label: 'Pendientes', value: stats.pending,         icon: ShieldAlert,   color: 'text-yellow-400' },
              { label: 'Usuarios',   value: stats.totalUsers,      icon: Users,         color: 'text-purple-400' },
              { label: 'Tareas',     value: stats.totalTasks,      icon: ClipboardList, color: 'text-green-400'  },
              { label: 'Validadas',  value: stats.validated,       icon: CheckCircle,   color: 'text-emerald-400'},
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <Icon size={18} className={`${color} mb-2`} />
                <div className="font-display font-bold text-2xl">{value ?? '…'}</div>
                <div className="text-xs text-gray-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
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

        {/* Households */}
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
                  <div className="text-xs text-gray-500 mt-1">
                    🔑 {h.invite_code} · 📅 {h.created_at?.split('T')[0]}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {h.status === 'pending' && (
                    <button onClick={() => approveHousehold(h.id, h.name)}
                      className="flex items-center gap-1 text-xs bg-green-900 text-green-300 hover:bg-green-800 px-3 py-1.5 rounded-lg transition-colors">
                      <CheckCircle size={12} /> Aprobar
                    </button>
                  )}
                  {h.status === 'approved' && (
                    <button onClick={() => suspendHousehold(h.id, h.name)}
                      className="flex items-center gap-1 text-xs bg-yellow-900 text-yellow-300 hover:bg-yellow-800 px-3 py-1.5 rounded-lg transition-colors">
                      <XCircle size={12} /> Suspender
                    </button>
                  )}
                  {h.status === 'suspended' && (
                    <button onClick={() => approveHousehold(h.id, h.name)}
                      className="flex items-center gap-1 text-xs bg-green-900 text-green-300 hover:bg-green-800 px-3 py-1.5 rounded-lg transition-colors">
                      <CheckCircle size={12} /> Reactivar
                    </button>
                  )}
                  <button onClick={() => deleteHousehold(h.id, h.name)}
                    className="text-gray-600 hover:text-red-400 transition-colors p-1.5">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            {!households.length && <p className="text-gray-600 text-center py-8">Sin hogares</p>}
          </div>
        )}

        {/* Users */}
        {!loading && tab === 'users' && (
          <div className="space-y-3">
            {users.map(u => (
              <div key={u.id} className="bg-gray-900 rounded-xl p-4 border border-gray-800 flex items-center gap-4">
                <span className="text-2xl">{u.avatar_emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{u.full_name}</div>
                  <div className="text-xs text-gray-500">
                    🏠 {u.households?.name || 'Sin hogar'} · ⭐ {u.points} pts
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select value={u.role} onChange={e => changeUserRole(u.id, e.target.value, u.full_name)}
                    className="text-xs bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-gray-300 focus:outline-none">
                    <option value="aprendiz">🌱 Aprendiz</option>
                    <option value="maestro">⭐ Maestro</option>
                    <option value="admin">👑 Admin</option>
                  </select>
                  <button onClick={() => deleteUser(u.id, u.full_name)}
                    className="text-gray-600 hover:text-red-400 transition-colors p-1.5">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            {!users.length && <p className="text-gray-600 text-center py-8">Sin usuarios</p>}
          </div>
        )}

        {/* Logs */}
        {!loading && tab === 'logs' && (
          <div className="space-y-2">
            {logs.map(l => (
              <div key={l.id} className="bg-gray-900 rounded-lg p-3 border border-gray-800 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-mono text-yellow-400">{l.action}</span>
                  <span className="text-xs text-gray-500 ml-2">{l.target_type} · {JSON.stringify(l.details)}</span>
                </div>
                <span className="text-xs text-gray-600 shrink-0">{l.created_at?.split('T')[0]}</span>
              </div>
            ))}
            {!logs.length && <p className="text-gray-600 text-center py-8">Sin actividad registrada</p>}
          </div>
        )}
      </div>
    </div>
  )
}
