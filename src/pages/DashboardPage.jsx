import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAuthStore } from '@/store/authStore'
import { useTaskStats, useTasks } from '@/hooks/useTasks'
import { supabase } from '@/lib/supabase'
import { CheckCircle, Clock, AlertCircle, ListTodo, TrendingUp, Copy } from 'lucide-react'
import toast from 'react-hot-toast'

const now = new Date()
const MONTH = now.getMonth() + 1
const YEAR  = now.getFullYear()

export default function DashboardPage() {
  const { profile } = useAuthStore()
  const stats = useTaskStats(MONTH, YEAR)
  const { tasks: upcoming } = useTasks({ month: MONTH, year: YEAR })
  const [members, setMembers] = useState([])

  useEffect(() => {
    if (!profile?.household_id) return
    supabase.from('profiles')
      .select('id, full_name, avatar_emoji, role, points, streak_days')
      .eq('household_id', profile.household_id)
      .order('points', { ascending: false })
      .then(({ data }) => setMembers(data || []))
  }, [profile?.household_id])

  const copyInviteCode = () => {
    navigator.clipboard.writeText(profile?.households?.invite_code || '')
    toast.success('¡Código copiado!')
  }

  const pending4 = upcoming.filter(t => t.status === 'pending').slice(0, 4)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-navy-800">
            Hola, {profile?.full_name?.split(' ')[0]} {profile?.avatar_emoji} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {format(now, "MMMM yyyy", { locale: es })} · {profile?.households?.name}
          </p>
        </div>
        {['maestro','admin'].includes(profile?.role) && (
          <button onClick={copyInviteCode}
            className="flex items-center gap-2 text-xs bg-navy-800 text-gold-400 px-3 py-2 rounded-lg hover:bg-navy-700 transition-colors font-mono">
            <Copy size={13} /> {profile?.households?.invite_code}
          </button>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: ListTodo,    label: 'Total',       value: stats?.total     ?? '…', color: 'text-blue-600',  bg: 'bg-blue-50'  },
          { icon: CheckCircle, label: 'Validadas',   value: stats?.validated ?? '…', color: 'text-green-600', bg: 'bg-green-50' },
          { icon: Clock,       label: 'En revisión', value: stats?.submitted ?? '…', color: 'text-yellow-600',bg: 'bg-yellow-50'},
          { icon: AlertCircle, label: 'Rechazadas',  value: stats?.rejected  ?? '…', color: 'text-red-500',   bg: 'bg-red-50'   },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="card p-4">
            <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-3`}>
              <Icon size={16} className={color} />
            </div>
            <div className="font-display font-extrabold text-2xl text-navy-800">{value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Progress */}
      {stats && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 font-semibold text-sm text-navy-800">
              <TrendingUp size={16} className="text-gold-500" /> Progreso del mes
            </div>
            <span className="font-display font-bold text-gold-500">{stats.rate}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div className="bg-gradient-to-r from-gold-400 to-green-400 h-3 rounded-full transition-all duration-700"
              style={{ width: `${stats.rate}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-2">{stats.validated} de {stats.total} tareas completadas</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-5">
        {/* Leaderboard */}
        <div className="card p-5">
          <h2 className="font-display font-bold text-base mb-4 flex items-center gap-2">🏆 Ranking del mes</h2>
          <div className="space-y-2">
            {members.map((m, i) => (
              <div key={m.id} className={`flex items-center gap-3 p-2 rounded-lg ${m.id === profile?.id ? 'bg-gold-50 border border-gold-200' : ''}`}>
                <span className="text-lg w-6 text-center">{['🥇','🥈','🥉','4️⃣','5️⃣'][i] || (i+1)}</span>
                <span className="text-xl">{m.avatar_emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{m.full_name} {m.id === profile?.id && <span className="text-xs text-gray-400">(tú)</span>}</p>
                  <p className="text-xs text-gray-400">🔥 {m.streak_days}d racha</p>
                </div>
                <span className="font-display font-bold text-gold-500 text-sm">{m.points} pts</span>
              </div>
            ))}
            {!members.length && <p className="text-sm text-gray-400">Sin miembros aún</p>}
          </div>
        </div>

        {/* Upcoming */}
        <div className="card p-5">
          <h2 className="font-display font-bold text-base mb-4">⏳ Próximas pendientes</h2>
          <div className="space-y-2">
            {pending4.map(t => (
              <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                <span className="text-xl">{t.task_definitions?.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{t.task_definitions?.name}</p>
                  <p className="text-xs text-gray-400">{t.profiles?.avatar_emoji} {t.profiles?.full_name}</p>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">📅 {t.due_date}</span>
              </div>
            ))}
            {!pending4.length && <p className="text-sm text-gray-400">Sin tareas pendientes 🎉</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
