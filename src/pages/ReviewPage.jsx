import { useState } from 'react'
import { useTasks } from '@/hooks/useTasks'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { CheckCircle, XCircle, X, ZoomIn } from 'lucide-react'

const now = new Date()
const MONTH = now.getMonth() + 1
const YEAR  = now.getFullYear()

export default function ReviewPage() {
  const { profile } = useAuthStore()
  const { tasks, loading, refetch } = useTasks({ pendingReview: true, month: MONTH, year: YEAR })
  const [modal, setModal] = useState(null)
  const [lightbox, setLightbox] = useState(null)

  if (loading) return <div className="text-gray-400 py-12 text-center">Cargando…</div>

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-extrabold text-2xl text-navy-800">🔍 Revisión</h1>
        <span className="badge bg-blue-100 text-blue-700">{tasks.length} en espera</span>
      </div>

      {tasks.length === 0 && (
        <div className="card p-10 text-center text-gray-400">
          <div className="text-4xl mb-3">✅</div>
          No hay tareas pendientes de revisión.
        </div>
      )}

      <div className="space-y-3">
        {tasks.map(t => {
          const def = t.task_definitions
          const assignee = t.profiles
          const lastSub = t.task_submissions?.at(-1)
          return (
            <div key={t.id} className="card p-4 border-l-4 border-blue-400">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{def?.icon}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-navy-800">{def?.name} — Semana {t.week_number}</h3>
                  <p className="text-sm text-gray-500">{def?.description}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {assignee?.avatar_emoji} {assignee?.full_name} · 📸 {lastSub?.photo_urls?.length || 0} fotos enviadas
                    {lastSub?.notes && ` · "${lastSub.notes}"`}
                  </p>
                  {/* Photo strip */}
                  {lastSub?.photo_urls?.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {lastSub.photo_urls.map((url, i) => (
                        <img key={i} src={url} alt="" onClick={() => setLightbox(url)}
                          className="w-14 h-14 object-cover rounded-lg cursor-zoom-in hover:opacity-90" />
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={() => setModal({ task: t })} className="btn-primary text-sm py-1.5">
                  Revisar
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {modal && (
        <ReviewModal
          task={modal.task}
          profile={profile}
          onClose={() => setModal(null)}
          onDone={() => { setModal(null); refetch() }}
          onLightbox={setLightbox}
        />
      )}

      {lightbox && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-w-full max-h-full rounded-xl shadow-2xl" />
          <button className="absolute top-4 right-4 text-white bg-black/40 rounded-full p-1" onClick={() => setLightbox(null)}>
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  )
}

function ReviewModal({ task, profile, onClose, onDone, onLightbox }) {
  const def = task.task_definitions
  const lastSub = task.task_submissions?.at(-1)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)

  const decide = async (approved) => {
    if (!approved && !comment.trim()) return toast.error('Escribe un comentario de rechazo')
    setLoading(true)
    try {
      await supabase.from('validations').insert({
        submission_id: lastSub?.id,
        assignment_id: task.id,
        reviewed_by: profile.id,
        approved,
        comment: comment.trim() || null,
      })
      // status updated by DB trigger, but also do it here for speed
      await supabase.from('task_assignments')
        .update({ status: approved ? 'validated' : 'rejected' })
        .eq('id', task.id)

      toast.success(approved ? '✅ Tarea validada' : '❌ Tarea rechazada con comentario')
      onDone()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-display font-bold text-lg">{def?.icon} {def?.name}</h2>
          <button onClick={onClose} className="text-gray-400"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="text-sm text-gray-600">
            {task.profiles?.avatar_emoji} <b>{task.profiles?.full_name}</b> · Semana {task.week_number}
          </div>
          <p className="text-sm text-gray-500">{def?.description}</p>

          {lastSub?.photo_urls?.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {lastSub.photo_urls.map((url, i) => (
                <div key={i} className="relative group">
                  <img src={url} alt="" className="w-full aspect-square object-cover rounded-lg" />
                  <button onClick={() => onLightbox(url)}
                    className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg flex items-center justify-center transition-all">
                    <ZoomIn size={20} className="text-white opacity-0 group-hover:opacity-100" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {lastSub?.notes && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">📝 {lastSub.notes}</div>
          )}

          <button disabled={loading}
            onClick={() => decide(true)}
            className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50">
            <CheckCircle size={16} /> Validar tarea
          </button>

          <div className="space-y-2">
            <textarea className="input resize-none" rows={3}
              placeholder="Motivo del rechazo (obligatorio para rechazar)…"
              value={comment} onChange={e => setComment(e.target.value)} />
            <button disabled={loading}
              onClick={() => decide(false)}
              className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50">
              <XCircle size={16} /> Rechazar con comentario
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
