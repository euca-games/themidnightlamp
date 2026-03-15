import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import PageShell from '../components/layout/PageShell'
import GameSearchInput from '../components/ui/GameSearchInput'
import MediaDetailModal from './MediaDetailPage'
import api from '../api/client'
import type { MediaItem, Collection, GameSearchResult, EntryWithMedia } from '../types/api'

const TYPE_LABELS: Record<string, string> = {
  game: 'Games',
  book: 'Books',
  movie: 'Movies',
  tv_show: 'TV Shows',
}

const STATUS_LABELS: Record<string, { want: string; in_progress: string }> = {
  game:    { want: 'Want to Play', in_progress: 'Playing' },
  book:    { want: 'Want to Read', in_progress: 'Reading' },
  movie:   { want: 'Want to Watch', in_progress: 'Watching' },
  tv_show: { want: 'Want to Watch', in_progress: 'Watching' },
}

const STATUS_BADGE: Record<string, string> = {
  want:        'bg-zinc-800 text-zinc-400',
  in_progress: 'bg-blue-950 text-blue-400',
  completed:   'bg-green-950 text-green-400',
  dropped:     'bg-red-950 text-red-400',
}

function getStatusTabs(type: string) {
  const l = STATUS_LABELS[type] ?? { want: 'Want', in_progress: 'In Progress' }
  return [
    { key: 'all',         label: 'All' },
    { key: 'want',        label: l.want },
    { key: 'in_progress', label: l.in_progress },
    { key: 'completed',   label: 'Completed' },
    { key: 'dropped',     label: 'Dropped' },
  ] as const
}

type StatusTab = 'all' | 'want' | 'in_progress' | 'completed' | 'dropped'

function thumbUrl(metadata: Record<string, unknown>): string | null {
  const url = metadata?.cover_url
  if (typeof url !== 'string' || !url) return null
  return url.replace('t_cover_big', 't_thumb')
}

export default function MediaListPage() {
  const { type } = useParams<{ type: string }>()
  const [statusTab, setStatusTab] = useState<StatusTab>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null)
  const [selectedCollection, setSelectedCollection] = useState('')
  const [removeTarget, setRemoveTarget] = useState<{ id: string; title: string } | null>(null)
  const [detailEntry, setDetailEntry] = useState<EntryWithMedia | null>(null)
  const qc = useQueryClient()

  const { data: entries = [], isLoading } = useQuery<EntryWithMedia[]>({
    queryKey: ['entries', type, statusTab],
    queryFn: () =>
      api.get('/entries', {
        params: { type, status: statusTab === 'all' ? undefined : statusTab },
      }).then((r) => r.data),
    enabled: !!type,
  })

  const { data: collections = [] } = useQuery<Collection[]>({
    queryKey: ['collections', type],
    queryFn: () => api.get('/collections', { params: { type } }).then((r) => r.data),
  })

  const createMedia = useMutation({
    mutationFn: ({ title, metadata }: { title: string; metadata?: Record<string, unknown> }) =>
      api.post<MediaItem>('/media', { type, title, metadata }).then((r) => r.data),
    onSuccess: (item) => {
      qc.invalidateQueries({ queryKey: ['entries', type] })
      setShowAdd(false)
      setNewTitle('')
      setSelectedItem(item)
    },
  })

  function handleGameSelect(result: GameSearchResult) {
    createMedia.mutate({
      title: result.title,
      metadata: {
        igdb_id: result.igdb_id,
        cover_url: result.cover_url,
        release_year: result.release_year,
        platforms: result.platforms,
        genres: result.genres,
        summary: result.summary,
      },
    })
  }

  const addToCollection = useMutation({
    mutationFn: ({ collectionId, mediaItemId }: { collectionId: string; mediaItemId: string }) =>
      api.post(`/collections/${collectionId}/entries`, { media_item_id: mediaItemId, status: 'want' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entries', type] })
      setSelectedItem(null)
      setSelectedCollection('')
    },
  })

  const removeMedia = useMutation({
    mutationFn: (id: string) => api.delete(`/media/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entries', type] })
      setRemoveTarget(null)
    },
  })

  const existingIgdbIds = new Set(
    entries
      .map((e) => e.metadata?.igdb_id as number | undefined)
      .filter((id): id is number => id != null),
  )

  const label = TYPE_LABELS[type ?? ''] ?? type
  const isGame = type === 'game'
  const statusTabs = getStatusTabs(type ?? '')

  function statusLabel(status: string) {
    const tab = statusTabs.find(t => t.key === status)
    return tab?.label ?? status
  }

  return (
    <PageShell title={label}>
      {/* Status tabs */}
      <div className="flex gap-1 mb-6 border-b border-zinc-800">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusTab(tab.key as StatusTab)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              statusTab === tab.key
                ? 'border-white text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-6">
        {isGame ? (
          <GameSearchInput onSelect={handleGameSelect} existingIgdbIds={existingIgdbIds} />
        ) : (
          <>
            <div className="flex-1" />
            <button
              onClick={() => setShowAdd(true)}
              className="px-4 py-2 bg-white text-zinc-950 rounded text-sm font-medium hover:bg-zinc-100 transition-colors"
            >
              + Add
            </button>
          </>
        )}
      </div>

      {showAdd && (
        <div className="mb-6 p-4 bg-zinc-900 border border-zinc-800 rounded-lg flex gap-3 items-center">
          <input
            type="text"
            placeholder="Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-zinc-500"
            onKeyDown={(e) => e.key === 'Enter' && newTitle && createMedia.mutate({ title: newTitle })}
            autoFocus
          />
          <button
            onClick={() => newTitle && createMedia.mutate({ title: newTitle })}
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
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-3 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded hover:border-zinc-700 transition-colors"
            >
              <div className="flex-shrink-0 w-8 h-11 bg-zinc-800 rounded overflow-hidden">
                {thumbUrl(entry.metadata) ? (
                  <img src={thumbUrl(entry.metadata)!} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full" />
                )}
              </div>

              <button
                onClick={() => setDetailEntry(entry)}
                className="flex-1 text-sm text-zinc-200 hover:text-white text-left"
              >
                {entry.title}
              </button>

              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[entry.status] ?? 'bg-zinc-800 text-zinc-400'}`}>
                {statusLabel(entry.status)}
              </span>

              {entry.rating != null ? (
                <span className="text-xs text-zinc-400 w-8 text-right">{entry.rating}/5</span>
              ) : (
                <span className="text-xs text-zinc-700 w-8 text-right">—</span>
              )}

              <button
                onClick={() => setSelectedItem({ id: entry.media_item_id, type: type! as import('../types/api').MediaType, title: entry.title, metadata: entry.metadata, created_at: '' })}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                + Collection
              </button>

              <button
                onClick={() => setRemoveTarget({ id: entry.media_item_id, title: entry.title })}
                className="text-xs text-red-700 hover:text-red-400 transition-colors"
              >
                Remove
              </button>
            </div>
          ))}
          {entries.length === 0 && (
            <p className="text-zinc-600 text-sm text-center py-12">
              {statusTab === 'all'
                ? `Nothing here yet. Add your first ${label?.toLowerCase()}.`
                : `No ${label?.toLowerCase()} marked as "${statusTabs.find(t => t.key === statusTab)?.label}".`}
            </p>
          )}
        </div>
      )}

      {/* Add to collection modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-white font-medium mb-4">Add to collection</h3>
            <p className="text-zinc-400 text-sm mb-4">{selectedItem.title}</p>
            {collections.length === 0 ? (
              <p className="text-zinc-500 text-sm mb-4">No collections yet. Create one first.</p>
            ) : (
              <div className="relative mb-4">
                <select
                  value={selectedCollection}
                  onChange={(e) => setSelectedCollection(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 pr-8 py-2 text-sm text-white focus:outline-none appearance-none"
                >
                  <option value="">Select collection…</option>
                  {collections.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
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

      {/* Remove confirmation modal */}
      {removeTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-white font-medium mb-2">Remove "{removeTarget.title}"?</h3>
            <p className="text-zinc-400 text-sm mb-6">
              This will permanently delete this item and remove it from every collection it's in.
              This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => removeMedia.mutate(removeTarget.id)}
                disabled={removeMedia.isPending}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white rounded py-2 text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {removeMedia.isPending ? 'Removing…' : 'Remove'}
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
      {/* Detail modal */}
      {detailEntry && (
        <MediaDetailModal
          entry={detailEntry}
          type={type!}
          onClose={() => setDetailEntry(null)}
        />
      )}
    </PageShell>
  )
}
