import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import PageShell from '../components/layout/PageShell'
import api from '../api/client'
import type { PublicProfile } from '../types/api'

const TYPE_LABELS: Record<string, string> = {
  game: 'Games',
  book: 'Books',
  movie: 'Movies',
  tv_show: 'TV Shows',
}

export default function PublicProfilePage() {
  const { username } = useParams<{ username: string }>()

  const { data: profile, isLoading, isError } = useQuery<PublicProfile>({
    queryKey: ['public-profile', username],
    queryFn: () => api.get(`/users/${username}/profile`).then((r) => r.data),
    enabled: !!username,
    retry: false,
  })

  if (isLoading) {
    return (
      <PageShell>
        <p className="text-zinc-500 text-sm text-center py-20">Loading…</p>
      </PageShell>
    )
  }

  if (isError || !profile) {
    return (
      <PageShell>
        <p className="text-zinc-500 text-sm text-center py-20">User not found.</p>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <div className="max-w-xl mx-auto">
        <div className="flex items-start gap-6 mb-8">
          <div className="w-20 h-20 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-600 text-2xl font-bold">
                {profile.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">{profile.username}</h1>
            <p className="text-xs text-zinc-600 mt-1">
              Member since {new Date(profile.created_at).toLocaleDateString()}
            </p>
            {profile.bio && (
              <p className="text-sm text-zinc-400 mt-3 whitespace-pre-wrap">{profile.bio}</p>
            )}
          </div>
        </div>

        <h2 className="text-sm font-medium text-zinc-400 mb-4">Public collections</h2>
        {profile.collections.length === 0 ? (
          <p className="text-sm text-zinc-600 text-center py-12">No public collections.</p>
        ) : (
          <div className="space-y-2">
            {profile.collections.map((c) => (
              <Link
                key={c.id}
                to={`/u/${username}/collections/${c.id}`}
                className="flex items-center justify-between px-4 py-3 bg-zinc-900 border border-zinc-800 rounded hover:border-zinc-700 transition-colors"
              >
                <span className="text-sm text-zinc-200">{c.name}</span>
                <span className="text-xs text-zinc-600">{TYPE_LABELS[c.type] ?? c.type}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  )
}
