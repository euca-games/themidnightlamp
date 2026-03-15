import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import PageShell from '../components/layout/PageShell'
import StarRating from '../components/ui/StarRating'
import api from '../api/client'
import type { Collection, EntryWithMedia, EntryStatus } from '../types/api'

const STATUS_LABELS: Record<EntryStatus, string> = {
  want: 'Want',
  in_progress: 'In Progress',
  completed: 'Completed',
  dropped: 'Dropped',
}

function thumbUrl(metadata: Record<string, unknown>): string | null {
  const url = metadata?.cover_url
  if (typeof url !== 'string' || !url) return null
  return url.replace('t_cover_big', 't_thumb')
}

export default function CollectionPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()

  const { data: collection } = useQuery<Collection>({
    queryKey: ['collection', id],
    queryFn: () => api.get(`/collections/${id}`).then((r) => r.data),
  })

  const { data: entries = [] } = useQuery<EntryWithMedia[]>({
    queryKey: ['entries', id],
    queryFn: () => api.get(`/collections/${id}/entries`).then((r) => r.data),
  })

  const updateEntry = useMutation({
    mutationFn: ({ entryId, data }: { entryId: string; data: Partial<EntryWithMedia> }) =>
      api.patch(`/collections/${id}/entries/${entryId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['entries', id] }),
  })

  const deleteEntry = useMutation({
    mutationFn: (entryId: string) => api.delete(`/collections/${id}/entries/${entryId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['entries', id] }),
  })

  return (
    <PageShell title={collection?.name ?? '…'}>
      {entries.length === 0 ? (
        <p className="text-zinc-600 text-sm text-center py-20">No items yet. Add media from the media pages.</p>
      ) : (
        <div className="space-y-px">
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-4 py-2 text-xs text-zinc-600 uppercase tracking-wider">
            <span></span>
            <span>Title</span>
            <span>Status</span>
            <span>Rating</span>
            <span></span>
          </div>
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded items-center"
            >
              <div className="flex-shrink-0 w-8 h-11 bg-zinc-800 rounded overflow-hidden">
                {thumbUrl(entry.metadata) ? (
                  <img src={thumbUrl(entry.metadata)!} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full" />
                )}
              </div>
              <span className="text-sm text-zinc-200">{entry.title}</span>
              <div className="relative">
                <select
                  value={entry.status}
                  onChange={(e) =>
                    updateEntry.mutate({ entryId: entry.id, data: { status: e.target.value as EntryStatus } })
                  }
                  className="bg-zinc-950 border border-zinc-700 rounded px-2 pr-7 py-1 text-xs text-zinc-300 focus:outline-none appearance-none"
                >
                  {Object.entries(STATUS_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
                <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <StarRating
                value={entry.rating}
                onChange={(v) =>
                  updateEntry.mutate({ entryId: entry.id, data: { rating: v } })
                }
              />
              <button
                onClick={() => deleteEntry.mutate(entry.id)}
                className="text-zinc-700 hover:text-red-400 transition-colors text-sm"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  )
}
