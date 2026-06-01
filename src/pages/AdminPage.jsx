import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { generateMonthAssignments } from '@/lib/assignments'
import { Plus, Trash2, RefreshCw, Users } from 'lucide-react'
import toast from 'react-hot-toast'

const ICONS = ['🍳','🚿','🛋️','🌿','👕','🧹','🛒','🪟','🗑️','🏡','🧽','🪣']

export default function AdminPage() {
  const { profile } = useAuthStore()
  const [defs, setDefs] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', icon: '📋', required_photos: 2, deadline_days: 2, points: 20 })

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const loadData = async () => {
    setLoading(true)
    const [{ data: d }, { data: m }] = await Promise.all([
      supabase.from('task_definitions').select('*').eq('household_id', profile.household_id).eq('is_active', true),
      supabase.from('profiles').select('id, full_name, avatar_emoji, role').eq('household_id', profile.household_id),
    ])
    setDefs(d || [])
    setMembers(m || [])
    setLoading(false)
  }

  useEffect(() => { if (profile?.household_id) loadData() }, [profile?.household_id])

  const createDef = async () => {
    if (!form.name.trim()) return toast.error('Nombre obligatorio')
    const { error } = await supabase.from('task_definitions').insert({
      ...form,
      required_photos: +form.required_photos,
      deadline_days: +form.deadline_days,
      points: +form.points,
      household_id: profile.household_id,
      created_by: profile.id,
    })
    if (error) return toast.error(error.message)
    toast.success('Tarea creada')
    setShowForm(false)
    setForm({ name: '', description: '', icon: '📋', required_photos: 2, deadline_days: 2, points: 20 })
    loadData()
  }

  const deleteDef = async (id) => {
    if (!confirm('¿Eliminar esta tarea? Las asignaciones existentes se mantendrán.')) return
    await supabase.from('task_definitions').update({ is_active: false }).eq('id', id)
    loadData()
  }

  const generateAssignments = async () => {
    const aprendices = members.filter(m => m.role === 'aprendiz').map(m => m.id)
    if (!aprendices.length) return toast.error('No hay aprendices en el hogar')
    if (!defs.length) return toast.error('Define tareas primero')

    const now = new Date()
    const assignments = generateMonthAssignments(defs, aprendices, now.getMonth() + 1, now.getFullYear(), profile.household_id)

    setGenerating(true)
    const { error } = await supabase.from('task_assignments').upsert(assignments, { onConflict: 'task_def_id,assigned_to,month,year,week_number' })
    setGenerating(false)

    if (error) return toast.error(error.message)
    toast.success(`✅ ${assignments.length} asignaciones generadas para ${now.toLocaleString('es', { month: 'long' })}`)
  }

  const updateRole = async (userId, newRole) => {
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    if (error) return toast.error(error.message)
    toast.success('Rol actualizado')
    loadData()
  }

  if (loading) return <div className="text-gray-400 py-12 text-center">Cargando…</div>

  return (
    <div className="space-y-8 animate-fade-in">
      <h1 className="font-display font-extrabold text-2xl text-navy-800">⚙️ Administrar hogar</h1>

      {/* Invite code */}
      <div className="card p-4 flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-sm text-navy-800">Código de invitación</p>
          <p className="text-xs text-gray-400">Compártelo para que otros se unan como aprendices</p>
        </div>
        <span className="font-mono text-xl font-bold text-gold-500 tracking-widest">
          {profile?.households?.invite_code}
        </span>
      </div>

      {/* Members */}
      <div>
        <h2 className="font-display font-bold text-base mb-3 flex items-center gap-2"><Users size={16} /> Miembros</h2>
        <div className="space-y-2">
          {members.map(m => (
            <div key={m.id} className="card p-3 flex items-center gap-3">
              <span className="text-2xl">{m.avatar_emoji}</span>
              <p className="flex-1 font-medium text-sm">{m.full_name}</p>
              <select value={m.role} onChange={e => updateRole(m.id, e.target.value)}
                disabled={m.id === profile.id}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-gold-400 disabled:opacity-50">
                <option value="aprendiz">🌱 Aprendiz</option>
                <option value="maestro">⭐ Maestro</option>
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Task definitions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-base">📋 Catálogo de tareas</h2>
          <button className="btn-primary flex items-center gap-1.5 text-sm py-1.5"
            onClick={() => setShowForm(s => !s)}>
            <Plus size={14} /> Nueva tarea
          </button>
        </div>

        {showForm && (
          <div className="card p-4 mb-4 space-y-3 border-2 border-gold-200">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Nombre *</label>
                <input className="input" value={form.name} onChange={set('name')} placeholder="Cocina" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Icono</label>
                <select className="input" value={form.icon} onChange={set('icon')}>
                  {ICONS.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Descripción</label>
              <input className="input" value={form.description} onChange={set('description')} placeholder="Limpiar hornillas y mesón…" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Fotos requeridas</label>
                <input className="input" type="number" min={1} max={10} value={form.required_photos} onChange={set('required_photos')} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Días plazo</label>
                <input className="input" type="number" min={1} value={form.deadline_days} onChange={set('deadline_days')} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Puntos</label>
                <input className="input" type="number" min={5} value={form.points} onChange={set('points')} />
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn-primary text-sm" onClick={createDef}>Guardar</button>
              <button className="btn-ghost text-sm" onClick={() => setShowForm(false)}>Cancelar</button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {defs.map(d => (
            <div key={d.id} className="card p-3 flex items-center gap-3">
              <span className="text-2xl">{d.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{d.name}</p>
                <p className="text-xs text-gray-400">{d.description}</p>
              </div>
              <div className="text-xs text-gray-400 text-right shrink-0">
                <p>📸 {d.required_photos} fotos</p>
                <p>🏅 {d.points} pts</p>
              </div>
              <button onClick={() => deleteDef(d.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          {!defs.length && <p className="text-sm text-gray-400">Sin tareas definidas. Crea la primera.</p>}
        </div>
      </div>

      {/* Generate assignments */}
      <div className="card p-5">
        <h2 className="font-display font-bold text-base mb-2">🔄 Generar asignaciones del mes</h2>
        <p className="text-sm text-gray-500 mb-4">
          Distribuye todas las tareas entre los aprendices de forma rotativa para el mes actual.
          Si ya existen asignaciones para este mes, serán actualizadas.
        </p>
        <div className="flex items-center gap-3 text-sm text-gray-400 bg-gray-50 rounded-lg p-3 mb-4">
          <span>📋 {defs.length} tareas · 👥 {members.filter(m=>m.role==='aprendiz').length} aprendices</span>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={generateAssignments} disabled={generating}>
          <RefreshCw size={15} className={generating ? 'animate-spin' : ''} />
          {generating ? 'Generando…' : 'Generar asignaciones'}
        </button>
      </div>
    </div>
  )
}
