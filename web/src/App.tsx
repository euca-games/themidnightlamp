import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMe } from './hooks/useAuth'
import { useAuthStore } from './store/authStore'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import MediaListPage from './pages/MediaListPage'
import CollectionsPage from './pages/CollectionsPage'
import CollectionPage from './pages/CollectionPage'
import ProfilePage from './pages/ProfilePage'

const queryClient = new QueryClient()

function AuthGate({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useMe()
  const storeUser = useAuthStore((s) => s.user)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <span className="text-zinc-600 text-sm">Loading…</span>
      </div>
    )
  }

  if (!user && !storeUser) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<AuthGate><DashboardPage /></AuthGate>} />
      <Route path="/media/:type" element={<AuthGate><MediaListPage /></AuthGate>} />
      <Route path="/collections" element={<AuthGate><CollectionsPage /></AuthGate>} />
      <Route path="/collections/:id" element={<AuthGate><CollectionPage /></AuthGate>} />
      <Route path="/profile" element={<AuthGate><ProfilePage /></AuthGate>} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
