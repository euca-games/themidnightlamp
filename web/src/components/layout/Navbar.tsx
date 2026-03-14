import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useLogout } from '../../hooks/useAuth'

export default function Navbar() {
  const user = useAuthStore((s) => s.user)
  const logout = useLogout()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout.mutateAsync()
    navigate('/login')
  }

  return (
    <nav className="border-b border-zinc-800 bg-zinc-950 px-6 py-3 flex items-center justify-between">
      <Link to="/dashboard" className="text-white font-semibold tracking-tight text-lg">
        the midnight lamp
      </Link>
      <div className="flex items-center gap-6 text-sm">
        <Link to="/media/game" className="text-zinc-400 hover:text-white transition-colors">Games</Link>
        <Link to="/media/book" className="text-zinc-400 hover:text-white transition-colors">Books</Link>
        <Link to="/media/movie" className="text-zinc-400 hover:text-white transition-colors">Movies</Link>
        <Link to="/media/tv_show" className="text-zinc-400 hover:text-white transition-colors">TV</Link>
        <Link to="/collections" className="text-zinc-400 hover:text-white transition-colors">Collections</Link>
        {user && (
          <>
            <Link to="/profile" className="text-zinc-400 hover:text-white transition-colors">{user.username}</Link>
            <button onClick={handleLogout} className="text-zinc-500 hover:text-white transition-colors">
              Sign out
            </button>
          </>
        )}
      </div>
    </nav>
  )
}
