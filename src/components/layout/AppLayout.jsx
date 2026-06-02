import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, ShieldCheck, Calendar, Settings, ShieldAlert, LogOut, Menu, X } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

const ROLE_COLORS = {
  aprendiz: 'bg-blue-100 text-blue-700',
  maestro:  'bg-yellow-100 text-yellow-700',
  admin:    'bg-purple-100 text-purple-700',
}
const ROLE_LABELS = { aprendiz: '🌱 Aprendiz', maestro: '⭐ Maestro', admin: '👑 Admin' }

export default function AppLayout() {
  const { profile, signOut } = useAuthStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()
  const isMaestro = ['maestro', 'admin'].includes(profile?.role)

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth')
    toast.success('Sesión cerrada')
  }

  const navLinks = [
    { to: '/',          icon: LayoutDashboard, label: 'Inicio',      end: true },
    { to: '/tareas',    icon: ClipboardList,   label: 'Mis Tareas'  },
    { to: '/historial', icon: Calendar,        label: 'Historial'   },
    ...(isMaestro ? [
      { to: '/revision', icon: ShieldCheck,  label: 'Revisión'     },
      { to: '/admin',    icon: ShieldAlert,  label: 'Administrar'  },
    ] : []),
    { to: '/ajustes',   icon: Settings,        label: 'Ajustes'     },
  ]

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-navy-600">
        <span className="text-2xl">🏠</span>
        <span className="font-display font-extrabold text-xl text-gold-400 tracking-tight">HomeTasks</span>
      </div>

      {/* Profile */}
      <div className="px-4 py-4 border-b border-navy-600">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-navy-600 flex items-center justify-center text-xl">
            {profile?.avatar_emoji || '🙂'}
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm truncate">{profile?.full_name}</p>
            <p className="text-gray-400 text-xs truncate">{profile?.households?.name || 'Sin hogar'}</p>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <span className={`badge ${ROLE_COLORS[profile?.role || 'aprendiz']}`}>
            {ROLE_LABELS[profile?.role || 'aprendiz']}
          </span>
          <span className="badge bg-yellow-100 text-yellow-700">⭐ {profile?.points || 0} pts</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navLinks.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end} onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive ? 'bg-gold-400 text-navy-800 font-semibold' : 'text-gray-300 hover:bg-navy-600 hover:text-white'
              }`
            }>
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-4 border-t border-navy-600">
        <button onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-semibold text-red-400 hover:bg-red-900/30 transition-all">
          <LogOut size={16} /> Cerrar sesión
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-stone-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 bg-navy-800 flex-col fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-60 bg-navy-800 flex flex-col z-50">
            <button className="absolute top-4 right-4 text-gray-400" onClick={() => setMobileOpen(false)}>
              <X size={20} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-30 h-14 bg-navy-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setMobileOpen(true)} className="text-gray-300">
            <Menu size={22} />
          </button>
          <span className="font-display font-bold text-gold-400">HomeTasks</span>
        </div>
        <button onClick={handleSignOut}
          className="flex items-center gap-1.5 text-red-400 text-sm font-semibold">
          <LogOut size={15} /> Salir
        </button>
      </div>

      {/* Main content */}
      <main className="flex-1 lg:ml-60 pt-14 lg:pt-0">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
