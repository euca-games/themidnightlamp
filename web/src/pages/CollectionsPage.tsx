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
  const [removeTarget, setRemoveTarget] = useState<Collection | null>(null)
  const qc = useQueryClient()

  const { data: collections = [] } = useQuery<Collection[]>({
    queryKey: ['collections'],
    queryFn: () => api.get('/collections').then((r) => r.data),
  })

  const deleteCollection = useMutation({
    mutationFn: (id: string) => api.delete(`/collections/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collections'] })
      setRemoveTarget(null)
    },
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
            <div key={c.id} className="flex items-center gap-3 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded hover:border-zinc-700 transition-colors">
              <Link to={`/collections/${c.id}`} className="flex-1 flex items-center gap-3 min-w-0">
                <span className="text-sm text-zinc-200">{c.name}</span>
                <span className="text-xs text-zinc-600">{TYPE_LABELS[c.type]}</span>
                {c.is_public && <span className="text-xs text-zinc-600">public</span>}
              </Link>
              <button
                onClick={() => setRemoveTarget(c)}
                className="text-xs text-red-700 hover:text-red-400 transition-colors shrink-0"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
      {removeTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-white font-medium mb-2">Delete "{removeTarget.name}"?</h3>
            <p className="text-zinc-400 text-sm mb-6">
              This will permanently delete the collection and all its entries. The media items themselves will not be deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => deleteCollection.mutate(removeTarget.id)}
                disabled={deleteCollection.isPending}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white rounded py-2 text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {deleteCollection.isPending ? 'Deleting…' : 'Delete'}
              </button>
              <button
                onClick={() => setRemoveTarget(null)}
                className="flex-1 border border-zinc-700 text-zinc-400 rounded py-2 text-sm hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  )
}
