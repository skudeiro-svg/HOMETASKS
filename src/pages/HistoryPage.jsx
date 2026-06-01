import { useState } from 'react'
import { format, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { useTasks } from '@/hooks/useTasks'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const STATUS_CFG = {
  pending:   { label: 'Pendiente',   dot: 'bg-yellow-400', bg: 'bg-yellow-50',  text: 'text-yellow-700' },
  submitted: { label: 'En revisión', dot: 'bg-blue-400',   bg: 'bg-blue-50',    text: 'text-blue-700'   },
  validated: { label: 'Validada',    dot: 'bg-green-400',  bg: 'bg-green-50',   text: 'text-green-700'  },
  rejected:  { label: 'Rechazada',   dot: 'bg-red-400',    bg: 'bg-red-50',     text: 'text-red-700'    },
}

export default function HistoryPage() {
  const [offset, setOffset] = useState(0) // 0 = current month
  const date  = subMonths(new Date(), offset)
  const month = date.getMonth() + 1
  const year  = date.getFullYear()

  const { tasks, loading } = useTasks({ month, year })

  // Group by task definition
  const byDef = {}
  tasks.forEach(t => {
    const k = t.task_def_id
    if (!byDef[k]) byDef[k] = { def: t.task_definitions, entries: [] }
    byDef[k].entries.push(t)
  })

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Month navigator */}
      <div className="flex items-center justify-between">
        <h1 className="font-display font-extrabold text-2xl text-navy-800">📅 Historial</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setOffset(o => o + 1)} className="btn-ghost p-2">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-navy-800 w-32 text-center capitalize">
            {format(date, 'MMMM yyyy', { locale: es })}
          </span>
          <button onClick={() => setOffset(o => Math.max(0, o - 1))} disabled={offset === 0}
            className="btn-ghost p-2 disabled:opacity-30">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {loading && <div className="text-gray-400 text-center py-10">Cargando…</div>}

      {!loading && tasks.length === 0 && (
        <div className="card p-10 text-center text-gray-400">
          <div className="text-4xl mb-2">📭</div>
          No hay datos para este mes.
        </div>
      )}

      {Object.values(byDef).map(({ def, entries }) => (
        <div key={def?.id} className="card p-5">
          <h2 className="font-display font-bold text-base mb-4 flex items-center gap-2">
            <span className="text-xl">{def?.icon}</span> {def?.name}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {entries.map(t => {
              const cfg = STATUS_CFG[t.status]
              const lastSub = t.task_submissions?.at(-1)
              return (
                <div key={t.id} className={`rounded-xl p-3 ${cfg.bg} border border-opacity-50`}>
                  <p className="font-semibold text-xs text-gray-500 mb-1">Semana {t.week_number}</p>
                  <p className="text-sm font-semibold text-navy-800">
                    {t.profiles?.avatar_emoji} {t.profiles?.full_name?.split(' ')[0]}
                  </p>
                  <div className={`badge mt-1.5 ${cfg.bg} ${cfg.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </div>
                  {lastSub?.photo_urls?.[0] && (
                    <img src={lastSub.photo_urls[0]} alt=""
                      className="w-full h-16 object-cover rounded-lg mt-2" />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
