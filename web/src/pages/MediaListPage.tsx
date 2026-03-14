import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import PageShell from '../components/layout/PageShell'
import api from '../api/client'
import type { MediaItem, Collection, PaginatedMedia } from '../types/api'

const TYPE_LABELS: Record<string, string> = {
  game: 'Games',
  book: 'Books',
  movie: 'Movies',
  tv_show: 'TV Shows',
}

export default function MediaListPage() {
  const { type } = useParams<{ type: string }>()
  const [q, setQ] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null)
  const [selectedCollection, setSelectedCollection] = useState('')
  const qc = useQueryClient()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery<PaginatedMedia>({
    queryKey: ['media', type, q],
    queryFn: () =>
      api.get('/media', { params: { type, q, limit: 50 } }).then((r) => r.data),
    enabled: !!type,
  })

  const { data: collections = [] } = useQuery<Collection[]>({
    queryKey: ['collections', type],
    queryFn: () => api.get('/collections', { params: { type } }).then((r) => r.data),
  })

  const createMedia = useMutation({
    mutationFn: (title: string) =>
      api.post<MediaItem>('/media', { type, title }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['media', type] })
      setShowAdd(false)
      setNewTitle('')
    },
  })

  const addToCollection = useMutation({
    mutationFn: ({ collectionId, mediaItemId }: { collectionId: string; mediaItemId: string }) =>
      api.post(`/collections/${collectionId}/entries`, { media_item_id: mediaItemId, status: 'want' }),
    onSuccess: () => {
      setSelectedItem(null)
      setSelectedCollection('')
    },
  })

  const label = TYPE_LABELS[type ?? ''] ?? type

  return (
    <PageShell title={label}>
      <div className="flex items-center gap-3 mb-6">
        <input
          type="text"
          placeholder={`Search ${label?.toLowerCase()}…`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
        />
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-white text-zinc-950 rounded text-sm font-medium hover:bg-zinc-100 transition-colors"
        >
          + Add
        </button>
      </div>

      {showAdd && (
        <div className="mb-6 p-4 bg-zinc-900 border border-zinc-800 rounded-lg flex gap-3 items-center">
          <input
            type="text"
            placeholder="Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-zinc-500"
            onKeyDown={(e) => e.key === 'Enter' && newTitle && createMedia.mutate(newTitle)}
            autoFocus
          />
          <button
            onClick={() => newTitle && createMedia.mutate(newTitle)}
            disabled={createMedia.isPending}
            className="px-3 py-1.5 bg-white text-zinc-950 rounded text-sm font-medium disabled:opacity-50"
          >
            Save
          </button>
          <button onClick={() => setShowAdd(false)} className="text-zinc-500 hover:text-white text-sm">
            Cancel
          </button>
        </div>
      )}

      {isLoading ? (
        <p className="text-zinc-500 text-sm">Loading…</p>
      ) : (
        <div className="space-y-1">
          {(data?.items ?? []).map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-4 py-3 bg-zinc-900 border border-zinc-800 rounded hover:border-zinc-700 transition-colors"
            >
              <button
                onClick={() => navigate(`/media/${type}/${item.id}`)}
                className="text-sm text-zinc-200 hover:text-white text-left"
              >
                {item.title}
              </button>
              <button
                onClick={() => setSelectedItem(item)}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                + Add to collection
              </button>
            </div>
          ))}
          {data?.items?.length === 0 && (
            <p className="text-zinc-600 text-sm text-center py-12">
              Nothing here yet. Add your first {label?.toLowerCase()}.
            </p>
          )}
        </div>
      )}

      {selectedItem && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-white font-medium mb-4">Add to collection</h3>
            <p className="text-zinc-400 text-sm mb-4">{selectedItem.title}</p>
            {collections.length === 0 ? (
              <p className="text-zinc-500 text-sm mb-4">No collections yet. Create one first.</p>
            ) : (
              <select
                value={selectedCollection}
                onChange={(e) => setSelectedCollection(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm text-white mb-4 focus:outline-none"
              >
                <option value="">Select collection…</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => selectedCollection && addToCollection.mutate({ collectionId: selectedCollection, mediaItemId: selectedItem.id })}
                disabled={!selectedCollection || addToCollection.isPending}
                className="flex-1 bg-white text-zinc-950 rounded py-2 text-sm font-medium disabled:opacity-40"
              >
                Add
              </button>
              <button onClick={() => setSelectedItem(null)} className="flex-1 border border-zinc-700 text-zinc-400 rounded py-2 text-sm hover:text-white">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  )
}
