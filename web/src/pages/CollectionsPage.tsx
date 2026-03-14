import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import PageShell from '../components/layout/PageShell'
import api from '../api/client'
import type { Collection, MediaType } from '../types/api'

const TYPE_LABELS: Record<MediaType, string> = {
  game: 'Game',
  book: 'Book',
  movie: 'Movie',
  tv_show: 'TV Show',
}

export default function CollectionsPage() {
  const [showNew, setShowNew] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<MediaType>('game')
  const [isPublic, setIsPublic] = useState(false)
  const qc = useQueryClient()

  const { data: collections = [] } = useQuery<Collection[]>({
    queryKey: ['collections'],
    queryFn: () => api.get('/collections').then((r) => r.data),
  })

  const createCollection = useMutation({
    mutationFn: () =>
      api.post<Collection>('/collections', { name, type, is_public: isPublic }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collections'] })
      setShowNew(false)
      setName('')
    },
  })

  return (
    <PageShell title="Collections">
      <div className="flex justify-end mb-6">
        <button
          onClick={() => setShowNew(true)}
          className="px-4 py-2 bg-white text-zinc-950 rounded text-sm font-medium hover:bg-zinc-100 transition-colors"
        >
          + New collection
        </button>
      </div>

      {showNew && (
        <div className="mb-6 p-5 bg-zinc-900 border border-zinc-800 rounded-lg space-y-3">
          <h3 className="text-sm font-medium text-white">New collection</h3>
          <input
            type="text"
            placeholder="Collection name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
            autoFocus
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as MediaType)}
            className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm text-white focus:outline-none"
          >
            <option value="game">Games</option>
            <option value="book">Books</option>
            <option value="movie">Movies</option>
            <option value="tv_show">TV Shows</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="accent-white"
            />
            Make public
          </label>
          <div className="flex gap-3 pt-1">
            <button
              onClick={() => name && createCollection.mutate()}
              disabled={!name || createCollection.isPending}
              className="px-4 py-2 bg-white text-zinc-950 rounded text-sm font-medium disabled:opacity-40"
            >
              Create
            </button>
            <button onClick={() => setShowNew(false)} className="text-zinc-500 hover:text-white text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      {collections.length === 0 ? (
        <p className="text-zinc-600 text-sm text-center py-20">No collections yet.</p>
      ) : (
        <div className="space-y-2">
          {collections.map((c) => (
            <Link
              key={c.id}
              to={`/collections/${c.id}`}
              className="flex items-center justify-between px-4 py-3 bg-zinc-900 border border-zinc-800 rounded hover:border-zinc-700 transition-colors"
            >
              <div>
                <span className="text-sm text-zinc-200">{c.name}</span>
                <span className="ml-3 text-xs text-zinc-600">{TYPE_LABELS[c.type]}</span>
              </div>
              {c.is_public && <span className="text-xs text-zinc-600">public</span>}
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  )
}
