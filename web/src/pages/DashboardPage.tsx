import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import PageShell from '../components/layout/PageShell'
import { useAuthStore } from '../store/authStore'
import api from '../api/client'
import type { Collection, MediaType } from '../types/api'

const TYPE_LABELS: Record<MediaType, string> = {
  game: 'Games',
  book: 'Books',
  movie: 'Movies',
  tv_show: 'TV Shows',
}

const MEDIA_TYPES: MediaType[] = ['game', 'book', 'movie', 'tv_show']

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)

  const { data: collections = [] } = useQuery<Collection[]>({
    queryKey: ['collections'],
    queryFn: () => api.get('/collections').then((r) => r.data),
  })

  const byType = MEDIA_TYPES.map((type) => ({
    type,
    label: TYPE_LABELS[type],
    collections: collections.filter((c) => c.type === type),
  }))

  return (
    <PageShell>
      <div className="mb-10">
        <h1 className="text-2xl font-semibold text-white">
          Welcome back{user ? `, ${user.username}` : ''}.
        </h1>
        <p className="text-zinc-500 text-sm mt-1">Your tracking dashboard.</p>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-12">
        {byType.map(({ type, label, collections }) => (
          <div key={type} className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-zinc-300">{label}</h2>
              <Link
                to={`/media/${type}`}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Browse →
              </Link>
            </div>
            {collections.length === 0 ? (
              <p className="text-zinc-600 text-xs">No collections yet.</p>
            ) : (
              <ul className="space-y-1">
                {collections.slice(0, 3).map((c) => (
                  <li key={c.id}>
                    <Link
                      to={`/collections/${c.id}`}
                      className="text-sm text-zinc-400 hover:text-white transition-colors flex items-center justify-between"
                    >
                      <span>{c.name}</span>
                      {c.is_public && (
                        <span className="text-xs text-zinc-600">public</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link
              to="/collections"
              className="block mt-4 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              + New collection
            </Link>
          </div>
        ))}
      </div>

      <div className="border-t border-zinc-800 pt-8">
        <h2 className="text-sm font-medium text-zinc-400 mb-4">Quick add media</h2>
        <div className="flex gap-3">
          {MEDIA_TYPES.map((type) => (
            <Link
              key={type}
              to={`/media/${type}`}
              className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded text-sm text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
            >
              {TYPE_LABELS[type]}
            </Link>
          ))}
        </div>
      </div>
    </PageShell>
  )
}
