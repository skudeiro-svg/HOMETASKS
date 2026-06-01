import { useState } from 'react'
import { useTasks } from '@/hooks/useTasks'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { uploadTaskPhoto } from '@/lib/storage'
import toast from 'react-hot-toast'
import { Camera, Send, RefreshCw, Eye, X } from 'lucide-react'

const now = new Date()
const MONTH = now.getMonth() + 1
const YEAR  = now.getFullYear()

const STATUS = {
  pending:   { label: 'Pendiente',   dot: 'bg-yellow-400', text: 'text-yellow-700', bg: 'bg-yellow-50' },
  submitted: { label: 'En revisión', dot: 'bg-blue-400',   text: 'text-blue-700',   bg: 'bg-blue-50'   },
  validated: { label: 'Validada',    dot: 'bg-green-400',  text: 'text-green-700',  bg: 'bg-green-50'  },
  rejected:  { label: 'Rechazada',   dot: 'bg-red-400',    text: 'text-red-700',    bg: 'bg-red-50'    },
}

export default function MyTasksPage() {
  const { profile } = useAuthStore()
  const { tasks, loading, refetch } = useTasks({ mine: true, month: MONTH, year: YEAR })
  const [modal, setModal] = useState(null) // { task } | null
  const [viewModal, setViewModal] = useState(null)

  const grouped = { pending: [], submitted: [], rejected: [], validated: [] }
  tasks.forEach(t => grouped[t.status]?.push(t))

  if (loading) return <div className="text-gray-400 py-12 text-center">Cargando tareas…</div>

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="font-display font-extrabold text-2xl text-navy-800">Mis Tareas</h1>

      {tasks.length === 0 && (
        <div className="card p-10 text-center text-gray-400">
          <div className="text-4xl mb-3">🎉</div>
          No tienes tareas asignadas este mes.
        </div>
      )}

      {Object.entries(grouped).map(([status, list]) => {
        if (!list.length) return null
        const cfg = STATUS[status]
        return (
          <div key={status}>
            <h2 className="font-semibold text-sm text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} /> {cfg.label} ({list.length})
            </h2>
            <div className="space-y-3">
              {list.map(t => (
                <TaskCard key={t.id} task={t} status={cfg}
                  onSubmit={() => setModal({ task: t })}
                  onView={() => setViewModal({ task: t })} />
              ))}
            </div>
          </div>
        )
      })}

      {modal && (
        <SubmitModal task={modal.task} profile={profile} onClose={() => setModal(null)} onDone={() => { setModal(null); refetch() }} />
      )}
      {viewModal && (
        <ViewModal task={viewModal.task} onClose={() => setViewModal(null)} />
      )}
    </div>
  )
}

function TaskCard({ task, status, onSubmit, onView }) {
  const def = task.task_definitions
  const lastSub = task.task_submissions?.at(-1)
  const lastVal = task.validations?.at(-1)

  return (
    <div className={`card p-4 border-l-4 ${task.status === 'validated' ? 'border-green-400' : task.status === 'rejected' ? 'border-red-400' : task.status === 'submitted' ? 'border-blue-400' : 'border-yellow-400'}`}>
      <div className="flex items-start gap-3">
        <span className="text-3xl">{def?.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-navy-800">{def?.name} — Semana {task.week_number}</h3>
            <span className={`badge ${status.bg} ${status.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{def?.description}</p>
          <p className="text-xs text-gray-400 mt-1">
            📅 Vence {task.due_date} · 📸 {def?.required_photos} foto{def?.required_photos > 1 ? 's' : ''} · 🏅 {def?.points} pts
          </p>
          {lastVal?.comment && (
            <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
              💬 <b>Maestro:</b> {lastVal.comment}
            </div>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {(task.status === 'pending' || task.status === 'rejected') && (
            <button onClick={onSubmit} className="btn-primary flex items-center gap-1.5 text-sm py-1.5">
              {task.status === 'rejected' ? <RefreshCw size={13} /> : <Camera size={13} />}
              {task.status === 'rejected' ? 'Repetir' : 'Entregar'}
            </button>
          )}
          {(task.status === 'submitted' || task.status === 'validated') && (
            <button onClick={onView} className="btn-ghost flex items-center gap-1.5 text-sm py-1.5">
              <Eye size={13} /> Ver
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function SubmitModal({ task, profile, onClose, onDone }) {
  const def = task.task_definitions
  const [files, setFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [notes, setNotes] = useState('')
  const [uploading, setUploading] = useState(false)

  const handleFiles = (e) => {
    const selected = Array.from(e.target.files)
    setFiles(selected)
    setPreviews(selected.map(f => URL.createObjectURL(f)))
  }

  const handleSubmit = async () => {
    if (files.length < def.required_photos)
      return toast.error(`Necesitas ${def.required_photos} foto${def.required_photos > 1 ? 's' : ''}`)

    setUploading(true)
    try {
      const urls = await Promise.all(files.map(f => uploadTaskPhoto(f, task.id, profile.id)))

      const lastAttempt = task.task_submissions?.length || 0
      const { data: sub, error: sErr } = await supabase.from('task_submissions').insert({
        assignment_id: task.id,
        submitted_by: profile.id,
        photo_urls: urls,
        notes: notes.trim() || null,
        attempt: lastAttempt + 1,
      }).select().single()

      if (sErr) throw sErr

      await supabase.from('task_assignments')
        .update({ status: 'submitted' })
        .eq('id', task.id)

      toast.success('¡Tarea enviada a revisión! 📤')
      onDone()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-display font-bold text-lg">{def?.icon} Entregar: {def?.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600">{def?.description}</p>
          <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
            Se requieren <b className="text-navy-800">{def?.required_photos}</b> foto{def?.required_photos > 1 ? 's' : ''} · {files.length} seleccionada{files.length !== 1 ? 's' : ''}
          </div>

          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {previews.map((p, i) => (
                <img key={i} src={p} alt="" className="w-full aspect-square object-cover rounded-lg" />
              ))}
            </div>
          )}

          <label className="flex flex-col items-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-6 cursor-pointer hover:border-gold-400 transition-colors">
            <Camera size={24} className="text-gray-300" />
            <span className="text-sm text-gray-500">Seleccionar fotos</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
          </label>

          <textarea className="input resize-none" rows={3} placeholder="Notas opcionales sobre la tarea…"
            value={notes} onChange={e => setNotes(e.target.value)} />

          <button className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
            onClick={handleSubmit} disabled={uploading || files.length < def?.required_photos}>
            {uploading ? '⏳ Subiendo…' : <><Send size={15} /> Enviar a revisión</>}
          </button>
        </div>
      </div>
    </div>
  )
}

function ViewModal({ task, onClose }) {
  const def = task.task_definitions
  const lastSub = task.task_submissions?.at(-1)
  const lastVal = task.validations?.at(-1)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-display font-bold text-lg">{def?.icon} {def?.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4">
          {lastSub?.photo_urls?.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {lastSub.photo_urls.map((url, i) => (
                <img key={i} src={url} alt="" className="w-full aspect-square object-cover rounded-lg" />
              ))}
            </div>
          )}
          {lastSub?.notes && (
            <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">📝 {lastSub.notes}</p>
          )}
          {lastVal && (
            <div className={`rounded-lg p-3 text-sm ${lastVal.approved ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {lastVal.approved ? '✅' : '❌'} <b>{lastVal.profiles?.full_name}:</b> {lastVal.comment || (lastVal.approved ? 'Tarea validada' : 'Rechazada')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
