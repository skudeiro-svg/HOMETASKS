import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

export default function OnboardPage() {
  const [tab, setTab] = useState('create') // create | join
  const [loading, setLoading] = useState(false)
  const [houseName, setHouseName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const { fetchProfile, user } = useAuthStore()
  const navigate = useNavigate()

  const createHousehold = async () => {
    if (!houseName.trim()) return toast.error('Pon un nombre al hogar')
    setLoading(true)
    try {
      const { data: household, error: hErr } = await supabase
        .from('households')
        .insert({ name: houseName.trim() })
        .select()
        .single()

      if (hErr) throw hErr

      const { error: pErr } = await supabase
        .from('profiles')
        .update({ household_id: household.id, role: 'maestro' })
        .eq('id', user.id)

      if (pErr) throw pErr

      await fetchProfile(user.id)
      toast.success(`¡Hogar "${household.name}" creado! Eres el primer maestro.`)
      navigate('/')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const joinHousehold = async () => {
    if (!inviteCode.trim()) return toast.error('Introduce el código de invitación')
    setLoading(true)
    try {
      const { data: household, error: hErr } = await supabase
        .from('households')
        .select()
        .eq('invite_code', inviteCode.trim().toUpperCase())
        .single()

      if (hErr || !household) throw new Error('Código no encontrado')

      const { error: pErr } = await supabase
        .from('profiles')
        .update({ household_id: household.id, role: 'aprendiz' })
        .eq('id', user.id)

      if (pErr) throw pErr

      await fetchProfile(user.id)
      toast.success(`¡Te has unido a "${household.name}"!`)
      navigate('/')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy-800 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-2">🏡</div>
          <h1 className="font-display font-extrabold text-2xl text-white">Configura tu hogar</h1>
          <p className="text-gray-400 text-sm mt-1">Crea uno nuevo o únete con un código</p>
        </div>

        <div className="card p-6">
          <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
            {[['create','Crear hogar'],['join','Unirme']].map(([id,label]) => (
              <button key={id} onClick={() => setTab(id)}
                className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-all ${tab===id ? 'bg-white shadow text-navy-800' : 'text-gray-500'}`}>
                {label}
              </button>
            ))}
          </div>

          {tab === 'create' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del hogar</label>
                <input className="input" value={houseName} onChange={e => setHouseName(e.target.value)}
                  placeholder="Casa de los García" />
                <p className="text-xs text-gray-400 mt-1">Se te asignará el rol de <b>Maestro</b> automáticamente.</p>
              </div>
              <button className="btn-primary w-full" onClick={createHousehold} disabled={loading}>
                {loading ? '⏳…' : '🏗 Crear hogar'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código de invitación</label>
                <input className="input font-mono uppercase tracking-widest" value={inviteCode}
                  onChange={e => setInviteCode(e.target.value)} placeholder="AB12CD34" maxLength={8} />
                <p className="text-xs text-gray-400 mt-1">Pídele el código a un Maestro del hogar.</p>
              </div>
              <button className="btn-primary w-full" onClick={joinHousehold} disabled={loading}>
                {loading ? '⏳…' : '🚪 Unirme al hogar'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
