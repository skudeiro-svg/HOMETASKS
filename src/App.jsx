import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'

import AuthPage        from '@/pages/AuthPage'
import OnboardPage     from '@/pages/OnboardPage'
import DashboardPage   from '@/pages/DashboardPage'
import MyTasksPage     from '@/pages/MyTasksPage'
import ReviewPage      from '@/pages/ReviewPage'
import HistoryPage     from '@/pages/HistoryPage'
import SettingsPage    from '@/pages/SettingsPage'
import AdminPage       from '@/pages/AdminPage'
import SuperAdminPage  from '@/pages/SuperAdminPage'
import AppLayout       from '@/components/layout/AppLayout'

const SUPERADMIN_EMAIL = 'skudeiro@gmail.com'

function RequireAuth({ children }) {
  const { user, profile, loading } = useAuthStore()
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>
  if (!user)    return <Navigate to="/auth" replace />
  if (!profile?.household_id) return <Navigate to="/onboard" replace />
  return children
}

function RequireMaestro({ children }) {
  const { profile } = useAuthStore()
  if (!['maestro', 'admin'].includes(profile?.role)) return <Navigate to="/" replace />
  return children
}

function RequireSuperAdmin({ children }) {
  const { user, loading } = useAuthStore()
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>
  if (!user) return <Navigate to="/auth" replace />
  if (user.email !== SUPERADMIN_EMAIL) return <Navigate to="/" replace />
  return children
}

function Spinner() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-4xl animate-bounce">🏠</div>
      <p className="text-sm text-gray-400">Cargando HomeTasks…</p>
    </div>
  )
}

export default function App() {
  const init = useAuthStore(s => s.init)
  useEffect(() => { init() }, [init])

  return (
    <BrowserRouter>
      <Toaster position="bottom-right" toastOptions={{ style: { fontFamily: 'DM Sans, sans-serif' } }} />
      <Routes>
        <Route path="/auth"    element={<AuthPage />} />
        <Route path="/onboard" element={<OnboardPage />} />

        <Route path="/superadmin" element={
          <RequireSuperAdmin><SuperAdminPage /></RequireSuperAdmin>
        } />

        <Route path="/" element={
          <RequireAuth><AppLayout /></RequireAuth>
        }>
          <Route index            element={<DashboardPage />} />
          <Route path="tareas"    element={<MyTasksPage />} />
          <Route path="historial" element={<HistoryPage />} />
          <Route path="ajustes"   element={<SettingsPage />} />
          <Route path="revision"  element={<RequireMaestro><ReviewPage /></RequireMaestro>} />
          <Route path="admin"     element={<RequireMaestro><AdminPage /></RequireMaestro>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
 { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'

import AuthPage      from '@/pages/AuthPage'
import OnboardPage   from '@/pages/OnboardPage'
import DashboardPage from '@/pages/DashboardPage'
import MyTasksPage   from '@/pages/MyTasksPage'
import ReviewPage    from '@/pages/ReviewPage'
import HistoryPage   from '@/pages/HistoryPage'
import SettingsPage  from '@/pages/SettingsPage'
import AdminPage     from '@/pages/AdminPage'
import AppLayout     from '@/components/layout/AppLayout'

function RequireAuth({ children }) {
  const { user, profile, loading } = useAuthStore()
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>
  if (!user)    return <Navigate to="/auth" replace />
  if (!profile?.household_id) return <Navigate to="/onboard" replace />
  return children
}

function RequireMaestro({ children }) {
  const { profile } = useAuthStore()
  if (!['maestro', 'admin'].includes(profile?.role)) return <Navigate to="/" replace />
  return children
}

function Spinner() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-4xl animate-bounce">🏠</div>
      <p className="text-sm text-gray-400">Cargando HomeTasks…</p>
    </div>
  )
}

export default function App() {
  const init = useAuthStore(s => s.init)
  useEffect(() => { init() }, [init])

  return (
    <BrowserRouter>
      <Toaster position="bottom-right" toastOptions={{ style: { fontFamily: 'DM Sans, sans-serif' } }} />
      <Routes>
        <Route path="/auth"    element={<AuthPage />} />
        <Route path="/onboard" element={<OnboardPage />} />

        <Route path="/" element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }>
          <Route index          element={<DashboardPage />} />
          <Route path="tareas"  element={<MyTasksPage />} />
          <Route path="historial" element={<HistoryPage />} />
          <Route path="ajustes"   element={<SettingsPage />} />
          <Route path="revision" element={
            <RequireMaestro><ReviewPage /></RequireMaestro>
          } />
          <Route path="admin" element={
            <RequireMaestro><AdminPage /></RequireMaestro>
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
