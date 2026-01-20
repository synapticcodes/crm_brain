import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import { AuthProvider, useAuth } from './hooks/useAuth'
import AppAccessPage from './pages/AppAccessPage'
import CustomersPage from './pages/CustomersPage'
import LegalPage from './pages/LegalPage'
import LoginPage from './pages/LoginPage'
import LogsPage from './pages/LogsPage'
import NotFoundPage from './pages/NotFoundPage'
import ProfilePage from './pages/ProfilePage'
import SupportPage from './pages/SupportPage'
import TeamPage from './pages/TeamPage'
import PromptsPage from './pages/PromptsPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="surface-panel px-6 py-4 text-sm text-ink/70">Carregando sessao...</div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function ProtectedLayout() {
  return (
    <RequireAuth>
      <AppShell />
    </RequireAuth>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/customers" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/app-access" element={<AppAccessPage />} />
            <Route path="/legal" element={<LegalPage />} />
            <Route path="/support" element={<SupportPage />} />
            <Route path="/prompts" element={<PromptsPage />} />
            <Route path="/logs" element={<LogsPage />} />
            <Route path="/team" element={<TeamPage />} />
            <Route path="/profile" element={<Navigate to="/meu-perfil" replace />} />
            <Route path="/meu-perfil" element={<ProfilePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
