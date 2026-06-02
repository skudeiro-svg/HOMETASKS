import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const SUPERADMIN_EMAIL = 'skudeiro@gmail.com'

export default function SuperAdminPage() {
  const [step, setStep] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)
  const [tab, setTab] = useState('households')
  const [households, setHouseholds] = useState([])
  const [users, setUsers] = useState([])
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setError('')
    if (!email || !password) return setError('Rellena todos los campos')
    if (email !== SUPERADMIN_EMAIL) return setError('Acceso denegado')
    setLoggingIn(true)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoggingIn(false)
    if (err) return setError('Credenciales incorrectas')
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
    const { count: c1 } = await supabase.from('households').select('*', { count: 'exact', head: true })
    const { count: c2 } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
    const { count: c3 } = await supabase.from('task_assignments').select('*', { count: 'exact', head: true })
    const { count: c4 } = await supabase.from('households').select('*', { count: 'exact', head: true }).eq('status', 'pending')
    setStats({ totalHouseholds: c1, totalUsers: c2, totalTasks: c3, pending: c4 })
    setLoading(false)
  }

  const approve = async (id, name) => {
    await supabase.from('households').update({ status: 'approved' }).eq('id', id)
    load()
  }

  const suspend = async (id, name) => {
    if (!confirm(`¿Suspender "${name}"?`)) return
    await supabase.from('households').update({ status: 'suspended' }).eq('id', id)
    load()
  }

  const deleteH = async (id, name) => {
    if (!confirm(`¿ELIMINAR "${name}"?`)) return
    await supabase.from('households').delete().eq('id', id)
    load()
  }

  const changeRole = async (userId, newRole) => {
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    load()
  }

  const deleteU = async (userId, name) => {
    if (!confirm(`¿Eliminar a "${name}"?`)) return
    await supabase.from('profiles').delete().eq('id', userId)
    load()
  }

  const s = { minHeight:'100vh', background:'#030712', color:'white', fontFamily:'sans-serif' }
  const card = { background:'#111827', borderRadius:'12px', padding:'16px', border:'1px solid #1f2937', marginBottom:'12px' }
  const btn = (bg, color) => ({ background: bg, color, border:'none', borderRadius:'8px', padding:'6px 12px', fontSize:'12px', cursor:'pointer', fontWeight:'600' })
  const inp = { width:'100%', background:'#1f2937', border:'1px solid #374151', borderRadius:'8px', padding:'8px 12px', color:'white', fontSize:'14px', boxSizing:'border-box', marginBottom:'12px' }

  if (step === 'login') return (
    <div style={{ ...s, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
      <div style={{ ...card, width:'100%', maxWidth:'360px' }}>
        <h1 style={{ fontSize:'20px', fontWeight:'bold', marginBottom:'4px' }}>🛡️ SuperAdmin</h1>
        <p style={{ color:'#6b7280', fontSize:'13px', marginBottom:'20px' }}>Panel de administración</p>
        {error && <p style={{ color:'#f87171', fontSize:'13px', marginBottom:'12px' }}>{error}</p>}
        <input style={inp} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input style={inp} type="password" placeholder="Contraseña" value={password}
          onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
        <button onClick={handleLogin} disabled={loggingIn}
          style={{ ...btn('#dc2626','white'), width:'100%', padding:'10px', fontSize:'14px' }}>
          {loggingIn ? 'Verificando…' : 'Acceder'}
        </button>
      </div>
    </div>
  )

  return (
    <div style={s}>
      <div style={{ background:'#111827', borderBottom:'1px solid #1f2937', padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontWeight:'bold' }}>🛡️ SuperAdmin</span>
        <button onClick={() => { supabase.auth.signOut(); setStep('login') }}
          style={btn('#374151','#d1d5db')}>Salir</button>
      </div>

      <div style={{ padding:'16px', maxWidth:'800px', margin:'0 auto' }}>
        {stats && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'20px' }}>
            {[['Hogares', stats.totalHouseholds,'#60a5fa'],['Pendientes',stats.pending,'#fbbf24'],
              ['Usuarios',stats.totalUsers,'#c084fc'],['Tareas',stats.totalTasks,'#4ade80']].map(([l,v,c]) => (
              <div key={l} style={card}>
                <div style={{ fontSize:'24px', fontWeight:'bold', color: c }}>{v ?? 0}</div>
                <div style={{ fontSize:'12px', color:'#6b7280' }}>{l}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display:'flex', gap:'4px', background:'#111827', borderRadius:'8px', padding:'4px', marginBottom:'16px', border:'1px solid #1f2937' }}>
          {[['households','🏠 Hogares'],['users','👥 Usuarios'],['logs','📋 Logs']].map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ flex:1, padding:'8px', fontSize:'12px', fontWeight:'600', borderRadius:'6px', border:'none', cursor:'pointer',
                background: tab===id ? '#374151' : 'transparent', color: tab===id ? 'white' : '#6b7280' }}>
              {label}
            </button>
          ))}
        </div>

        {loading && <p style={{ color:'#6b7280', textAlign:'center', padding:'32px' }}>Cargando…</p>}

        {!loading && tab === 'households' && households.map(h => (
          <div key={h.id} style={card}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'8px' }}>
              <div>
                <span style={{ fontWeight:'600' }}>{h.name}</span>
                <span style={{ marginLeft:'8px', fontSize:'11px', padding:'2px 8px', borderRadius:'99px', fontWeight:'600',
                  background: h.status==='approved'?'#14532d':h.status==='pending'?'#713f12':'#7f1d1d',
                  color: h.status==='approved'?'#86efac':h.status==='pending'?'#fde68a':'#fca5a5' }}>
                  {h.status}
                </span>
                <div style={{ fontSize:'11px', color:'#6b7280', marginTop:'4px' }}>🔑 {h.invite_code}</div>
              </div>
              <div style={{ display:'flex', gap:'8px' }}>
                {h.status !== 'approved' && <button onClick={() => approve(h.id, h.name)} style={btn('#14532d','#86efac')}>✅ Aprobar</button>}
                {h.status === 'approved' && <button onClick={() => suspend(h.id, h.name)} style={btn('#713f12','#fde68a')}>⏸ Suspender</button>}
                <button onClick={() => deleteH(h.id, h.name)} style={btn('#1f2937','#f87171')}>🗑</button>
              </div>
            </div>
          </div>
        ))}

        {!loading && tab === 'users' && users.map(u => (
          <div key={u.id} style={card}>
            <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
              <span style={{ fontSize:'24px' }}>{u.avatar_emoji}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:'600', fontSize:'14px' }}>{u.full_name}</div>
                <div style={{ fontSize:'12px', color:'#6b7280' }}>🏠 {u.households?.name || 'Sin hogar'}</div>
              </div>
              <select value={u.role} onChange={e => changeRole(u.id, e.target.value)}
                style={{ background:'#1f2937', border:'1px solid #374151', borderRadius:'8px', padding:'4px 8px', color:'#d1d5db', fontSize:'12px' }}>
                <option value="aprendiz">🌱 Aprendiz</option>
                <option value="maestro">⭐ Maestro</option>
                <option value="admin">👑 Admin</option>
              </select>
              <button onClick={() => deleteU(u.id, u.full_name)} style={btn('#1f2937','#f87171')}>🗑</button>
            </div>
          </div>
        ))}

        {!loading && tab === 'logs' && logs.map(l => (
          <div key={l.id} style={{ ...card, padding:'10px 12px' }}>
            <span style={{ fontSize:'11px', fontFamily:'monospace', color:'#fbbf24' }}>{l.action}</span>
            <span style={{ fontSize:'11px', color:'#6b7280', marginLeft:'8px' }}>{JSON.stringify(l.details)}</span>
            <span style={{ fontSize:'11px', color:'#4b5563', float:'right' }}>{l.created_at?.split('T')[0]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
