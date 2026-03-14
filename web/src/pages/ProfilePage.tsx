import { useAuthStore } from '../store/authStore'
import PageShell from '../components/layout/PageShell'

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user)

  return (
    <PageShell title="Profile">
      <div className="max-w-sm space-y-4">
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Username</label>
          <p className="text-sm text-white">{user?.username}</p>
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Email</label>
          <p className="text-sm text-zinc-300">{user?.email}</p>
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Member since</label>
          <p className="text-sm text-zinc-400">
            {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
          </p>
        </div>
      </div>
    </PageShell>
  )
}
