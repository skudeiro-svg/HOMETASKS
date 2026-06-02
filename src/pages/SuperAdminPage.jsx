import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Trash2, RefreshCw, LogOut, ShieldAlert } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

const SUPERADMIN_EMAIL = 'skudeiro@gmail.com'

export default function SuperAdminPage() {
  const [step, setStep] = useState('login')
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
    await supabase.from('admin_logs').insert({ action, target_type: targetType, target_id: targetId, details, performed_by: SUPERADMIN_EMAIL })
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
    if (!confirm(`¿ELIMINAR "${name}"?`)) return
    const { error } = await supabase.from('households').delete().eq('id', id)
    if (error) return toast.error(error.message)
    toast.success('Hogar eliminado')
    load()
  }

  const changeUserRole = async (userId, newRole, name) => {
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    if (error) return toast.error(error.message)
    toast.success('Rol actualizado')
    load()
  }

  const deleteUser = async (userId, name) => {
    if (!confirm(`¿Eliminar a "${name}"?`)) return
    const { error } = await supabase.from('profiles').delete().eq('id', userId)
    if (error) return toast.error(error.message)
    toast.success('Usuario eliminado')
    load()
  }

  if (step === 'login') return (
    <div style={{ minHeight:'100vh', background:'#030712', display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
      <Toaster />
      <div style={{ background:'#111827', borderRadius:'16px', padding:'32px', width:'100%', maxWidth:'360px', border:'1px solid #1f2937' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'24px' }}>
          <span style={{ fontSize:'20px' }}>🛡️</span>
          <span style={{ color:'white', fontWeight:'bold', fontSize:'18px' }}>SuperAdmin</span>
          <span style={{ background:'#7f1d1d', color:'#fca5a5', fontSize:'11px', padding:'2px 8px', borderRadius:'99px' }}>BACKEND</span>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
          <div>
            <label style={{ color:'#6b7280', fontSize:'12px', display:'block', marginBottom:'4px' }}>Email</label>
            <input style={{ width:'100%', background:'#1f2937', border:'1px solid #374151', borderRadius:'8px', padding:'8px 12px', color:'white', fontSize:'14px', boxSizing:'border-box' }}
              type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@email.com" />
          </div>
          <div>
            <label style={{ color:'#6b7280', fontSize:'12px', display:'block', marginBottom:'4px' }}>Contraseña</label>
            <input style={{ width:'100%', background:'#1f2937', border:'1px solid #374151', borderRadius:'8px', padding:'8px 12px', color:'white', fontSize:'14px', boxSizing:'border-box' }}
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()} placeholder="••••••••" />
          </div>
          <button onClick={handleLogin} disabled={loggingIn}
            style={{ background:'#dc2626', color:'white', border:'none', borderRadius:'8px', padding:'10px', fontWeight:'600', fontSize:'14px', cursor:'pointer', opacity: loggingIn ? 0.5 : 1 }}>
            {loggingIn ? 'Verificando…' : 'Acceder al panel'}
          </button>
        </div>
      </div>
    </div>
  )

  const STATUS_COLORS = {
    approved:  { background:'#14532d', color:'#86efac' },
    pending:   { background:'#713f12', color:'#fde68a' },
    suspended: { background:'#7f1d1d', color:'#fca5a5' },
  }

  return (
    <div style={{ minHeight:'100vh', background:'#030712', color:'white' }}>
      <Toaster />
      <div style={{ background:'#111827', borderBottom:'1px solid #1f2937', padding:'16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <span>🛡️</span>
          <span style={{ fontWeight:'bold', fontSize:'18px' }}>SuperAdmin</span>
          <span style={{ background:'#7f1d1d', color:'#fca5a5', fontSize:'11px', padding:'2px 8px', borderRadius:'99px' }}>BACKEND</span>
        </div>
        <div style={{ display:'flex', gap:'12px' }}>
          <button onClick={load} style={{ background:'none', border:'none', color:'#9ca3af', cursor:'pointer', fontSize:'18px' }}>↻</button>
          <button onClick={() => { supabase.auth.signOut(); setStep('login') }}
            style={{ background:'none', border:'none', color:'#9ca3af', cursor:'pointer', fontSize:'13px' }}>
            Salir
          </button>
        </div>
      </div>

      <div style={{ maxWidth:'800px', margin:'0 auto', padding:'24px 16px' }}>
        {stats && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'12px', marginBottom:'24px' }}>
            {[
              { label:'Hogares',    value: stats.totalHouseholds, color:'#60a5fa' },
              { label:'Pendientes', value: stats.pending,         color:'#fbbf24' },
              { label:'Usuarios',   value: stats.totalUsers,      color:'#c084fc' },
              { label:'Tareas',     value: stats.totalTasks,      color:'#4ade80' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background:'#111827', borderRadius:'12px', padding:'16px', border:'1px solid #1f2937' }}>
                <div style={{ fontSize:'28px', fontWeight:'bold', color }}>{value ?? '…'}</div>
                <div style={{ fontSize:'12px', color:'#6b7280', marginTop:'4px' }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display:'flex', gap:'4px', background:'#111827', borderRadius:'8px', padding:'4px', border:'1px solid #1f2937', marginBottom:'20px' }}>
          {[['households','🏠 Hogares'],['users','👥 Usuarios'],['logs','📋 Logs']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ flex:1, padding:'8px', fontSize:'13px', fontWeight:'600', borderRadius:'6px', border:'none', cursor:'pointer',
                background: tab === id ? '#374151' : 'transparent', color: tab === id ? 'white' : '#6b7280' }}>
              {label}
            </button>
          ))}
        </div>

        {loading && <div style={{ color:'#6b7280', textAlign:'center', padding:'40px' }}>Cargando…</div>}

        {!loading && tab === 'households' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
            {households.map(h => (
              <div key={h.id} style={{ background:'#111827', borderRadius:'12px', padding:'16px', border:'1px solid #1f2937', display:'flex', alignItems:'center', gap:'12px' }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
                    <span style={{ fontWeight:'600' }}>{h.name}</span>
                    <span style={{ fontSize:'11px', padding:'2px 8px', borderRadius:'99px', fontWeight:'600', ...(STATUS_COLORS[h.status] || {}) }}>
                      {h.status}
                    </span>
                  </div>
                  <div style={{ fontSize:'12px', color:'#6b7280', marginTop:'4px' }}>🔑 {h.invite_code} · {h.created_at?.split('T')[0]}</div>
                </div>
                <div style={{ display:'flex', gap:'8px' }}>
                  {h.status !== 'approved' && (
                    <button onClick={() => approveHousehold(h.id, h.name)}
                      style={{ background:'#14532d', color:'#86efac', border:'none', borderRadius:'8px', padding:'6px 12px', fontSize:'12px', cursor:'pointer' }}>
                      ✅ Aprobar
                    </button>
                  )}
                  {h.status === 'approved' && (
                    <button onClick={() => suspendHousehold(h.id, h.name)}
                      style={{ background:'#713f12', color:'#fde68a', border:'none', borderRadius:'8px', padding:'6px 12px', fontSize:'12px', cursor:'pointer' }}>
                      ⏸ Suspender
                    </button>
                  )}
                  <button onClick={() => deleteHousehold(h.id, h.name)}
                    style={{ background:'none', border:'none', color:'#4b5563', cursor:'pointer', fontSize:'16px' }}>
                    🗑
                  </button>
                </div>
              </div>
            ))}
            {!households.length && <p style={{ color:'#4b5563', textAlign:'center', padding:'32px' }}>Sin hogares</p>}
          </div>
        )}

        {!loading && tab === 'users' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
            {users.map(u => (
              <div key={u.id} style={{ background:'#111827', borderRadius:'12px', padding:'16px', border:'1px solid #1f2937', display:'flex', alignItems:'center', gap:'12px' }}>
                <span style={{ fontSize:'24px' }}>{u.avatar_emoji}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:'600', fontSize:'14px' }}>{u.full_name}</div>
                  <div style={{ fontSize:'12px', color:'#6b7280' }}>🏠 {u.households?.name || 'Sin hogar'} · ⭐ {u.points} pts</div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  <select value={u.role} onChange={e => changeUserRole(u.id, e.target.value, u.full_name)}
                    style={{ background:'#1f2937', border:'1px solid #374151', borderRadius:'8px', padding:'4px 8px', color:'#d1d5db', fontSize:'12px' }}>
                    <option value="aprendiz">🌱 Aprendiz</option>
                    <option value="maestro">⭐ Maestro</option>
                    <option value="admin">👑 Admin</option>
                  </select>
                  <button onClick={() => deleteUser(u.id, u.full_name)}
                    style={{ background:'none', border:'none', color:'#4b5563', cursor:'pointer', fontSize:'16px' }}>
                    🗑
                  </button>
                </div>
              </div>
            ))}
            {!users.length && <p style={{ color:'#4b5563', textAlign:'center', padding:'32px' }}>Sin usuarios</p>}
          </div>
        )}

        {!loading && tab === 'logs' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            {logs.map(l => (
              <div key={l.id} style={{ background:'#111827', borderRadius:'8px', padding:'12px', border:'1px solid #1f2937', display:'flex', gap:'12px' }}>
                <span style={{ fontSize:'12px', fontFamily:'monospace', color:'#fbbf24' }}>{l.action}</span>
                <span style={{ fontSize:'12px', color:'#6b7280', flex:1 }}>{JSON.stringify(l.details)}</span>
                <span style={{ fontSize:'12px', color:'#4b5563' }}>{l.created_at?.split('T')[0]}</span>
              </div>
            ))}
            {!logs.length && <p style={{ color:'#4b5563', textAlign:'center', padding:'32px' }}>Sin actividad</p>}
          </div>
        )}
      </div>
    </div>
  )
}
