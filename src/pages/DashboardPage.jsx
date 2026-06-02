import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAuthStore } from '@/store/authStore'
import { useTaskStats, useTasks } from '@/hooks/useTasks'
import { supabase } from '@/lib/supabase'
import { Copy, TrendingUp } from 'lucide-react'
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
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h1 className="font-display font-extrabold text-xl text-navy-800">
            Hola, {profile?.full_name?.split(' ')[0]} {profile?.avatar_emoji}
          </h1>
          {['maestro','admin'].includes(profile?.role) && (
            <button onClick={copyInviteCode}
              className="flex items-center gap-1.5 text-xs bg-navy-800 text-gold-400 px-3 py-1.5 rounded-lg font-mono font-bold shrink-0">
              <Copy size={11} /> {profile?.households?.invite_code}
            </button>
          )}
        </div>
        <p className="text-gray-400 text-sm mt-0.5 capitalize">
          {format(now, "MMMM yyyy", { locale: es })} · {profile?.households?.name}
        </p>
      </div>

      {/* Stat cards - 2x2 grid full width */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Total',       value: stats?.total,     emoji: '📋', color: 'text-blue-600',  bg: 'bg-blue-50'   },
          { label: 'Validadas',   value: stats?.validated, emoji: '✅', color: 'text-green-600', bg: 'bg-green-50'  },
          { label: 'En revisión', value: stats?.submitted, emoji: '🔍', color: 'text-yellow-600',bg: 'bg-yellow-50' },
          { label: 'Rechazadas',  value: stats?.rejected,  emoji: '❌', color: 'text-red-500',   bg: 'bg-red-50'    },
        ].map(({ label, value, emoji, color, bg }) => (
          <div key={label} className="card p-4">
            <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center text-base mb-2`}>
              {emoji}
            </div>
            <div className={`font-display font-extrabold text-3xl ${color}`}>
              {value ?? 0}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Progress */}
      {stats && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-navy-800 flex items-center gap-1.5">
              <TrendingUp size={14} className="text-gold-500" /> Progreso del mes
            </span>
            <span className="font-display font-bold text-gold-500 text-sm">{stats.rate}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div className="bg-gradient-to-r from-gold-400 to-green-400 h-2.5 rounded-full transition-all duration-700"
              style={{ width: `${stats.rate}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1.5">{stats.validated} de {stats.total} tareas completadas</p>
        </div>
      )}

      {/* Leaderboard */}
      <div className="card p-4">
        <h2 className="font-display font-bold text-sm mb-3">🏆 Ranking del mes</h2>
        <div className="space-y-2">
          {members.map((m, i) => (
            <div key={m.id} className={`flex items-center gap-2 p-2 rounded-lg ${m.id === profile?.id ? 'bg-yellow-50 border border-yellow-200' : ''}`}>
              <span className="text-base w-5 text-center">{['🥇','🥈','🥉','4️⃣','5️⃣'][i] || (i+1)}</span>
              <span className="text-lg">{m.avatar_emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">
                  {m.full_name?.split(' ')[0]} {m.id === profile?.id && <span className="text-gray-400 font-normal">(tú)</span>}
                </p>
                <p className="text-xs text-gray-400">🔥 {m.streak_days}d</p>
              </div>
              <span className="font-display font-bold text-gold-500 text-sm">{m.points}p</span>
            </div>
          ))}
          {!members.length && <p className="text-xs text-gray-400">Sin miembros aún</p>}
        </div>
      </div>

      {/* Upcoming */}
      <div className="card p-4">
        <h2 className="font-display font-bold text-sm mb-3">⏳ Próximas pendientes</h2>
        <div className="space-y-2">
          {pending4.map(t => {
            const assignee = t.profiles
            return (
              <div key={t.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50">
                <span className="text-xl">{t.task_definitions?.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{t.task_definitions?.name} · Sem. {t.week_number}</p>
                  <p className="text-xs text-gray-400">{assignee?.avatar_emoji} {assignee?.full_name?.split(' ')[0]}</p>
                </div>
                <span className="text-xs text-gray-400 shrink-0">{t.due_date}</span>
              </div>
            )
          })}
          {!pending4.length && <p className="text-xs text-gray-400">Sin tareas pendientes 🎉</p>}
        </div>
      </div>
    </div>
  )
}
