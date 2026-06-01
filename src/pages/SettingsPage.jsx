import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

const AVATARS = ['🙂','😊','🧑‍🦰','👩‍🦱','🧔','👧','👦','👩‍🦳','🧑‍🦲','🧑‍💼','👩‍💻','🧑‍🍳']

export default function SettingsPage() {
  const { profile, updateProfile } = useAuthStore()
  const [form, setForm] = useState({ full_name: profile?.full_name || '', avatar_emoji: profile?.avatar_emoji || '🙂' })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    const { error } = await updateProfile(form)
    setSaving(false)
    if (error) toast.error(error.message)
    else toast.success('Perfil actualizado ✅')
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-md">
      <h1 className="font-display font-extrabold text-2xl text-navy-800">⚙️ Ajustes</h1>

      <div className="card p-5 space-y-5">
        <h2 className="font-display font-bold text-base">Mi perfil</h2>

        {/* Avatar picker */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">Avatar</label>
          <div className="flex flex-wrap gap-2">
            {AVATARS.map(a => (
              <button key={a} onClick={() => setForm(p => ({ ...p, avatar_emoji: a }))}
                className={`text-2xl p-2 rounded-lg border-2 transition-all ${form.avatar_emoji === a ? 'border-gold-400 bg-gold-50' : 'border-transparent hover:border-gray-200'}`}>
                {a}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Nombre</label>
          <input className="input" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} />
        </div>

        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? '⏳ Guardando…' : '💾 Guardar cambios'}
        </button>
      </div>

      <div className="card p-5 space-y-2">
        <h2 className="font-display font-bold text-base mb-3">Mi hogar</h2>
        <div className="text-sm text-gray-600 space-y-1">
          <p>🏠 <b>{profile?.households?.name}</b></p>
          <p>🔑 Código: <span className="font-mono font-bold text-gold-500">{profile?.households?.invite_code}</span></p>
          <p>👤 Rol: <span className="font-semibold">{profile?.role}</span></p>
          <p>⭐ Puntos totales: <span className="font-semibold">{profile?.points}</span></p>
          <p>🔥 Racha actual: <span className="font-semibold">{profile?.streak_days} días</span></p>
        </div>
      </div>
    </div>
  )
}
