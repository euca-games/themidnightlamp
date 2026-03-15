import { useMutation, useQueryClient } from '@tanstack/react-query'
import StarRating from '../components/ui/StarRating'
import type { EntryWithMedia, EntryStatus } from '../types/api'

const STATUS_OPTIONS: Record<EntryStatus, string> = {
  want: 'Want',
  in_progress: 'In Progress',
  completed: 'Completed',
  dropped: 'Dropped',
}

const STATUS_LABELS: Record<string, Record<string, string>> = {
  game:    { want: 'Want to Play', in_progress: 'Playing' },
  book:    { want: 'Want to Read', in_progress: 'Reading' },
  movie:   { want: 'Want to Watch', in_progress: 'Watching' },
  tv_show: { want: 'Want to Watch', in_progress: 'Watching' },
}

function coverUrl(metadata: Record<string, unknown>): string | null {
  const url = metadata?.cover_url
  if (typeof url !== 'string' || !url) return null
  return url.replace('t_thumb', 't_cover_big')
}

interface Props {
  entry: EntryWithMedia
  type: string
  onClose: () => void
}

export default function MediaDetailModal({ entry, type, onClose }: Props) {
  const qc = useQueryClient()

  const updateEntry = useMutation({
    mutationFn: (data: Partial<EntryWithMedia>) =>
      import('../api/client').then((m) =>
        m.default.patch(`/collections/${entry.collection_id}/entries/${entry.id}`, data),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['entries', type] }),
  })

  const labels = STATUS_LABELS[type] ?? {}
  function statusLabel(key: string) {
    return labels[key] ?? STATUS_OPTIONS[key as EntryStatus] ?? key
  }

  const metadata = entry.metadata ?? {}
  const cover = coverUrl(metadata)
  const platforms = Array.isArray(metadata.platforms) ? (metadata.platforms as string[]) : []
  const genres = Array.isArray(metadata.genres) ? (metadata.genres as string[]) : []
  const releaseYear = metadata.release_year as number | undefined
  const summary = typeof metadata.summary === 'string' ? (metadata.summary as string) : null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-medium text-white">{entry.title}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors text-sm ml-4">
            ✕
          </button>
        </div>

        <div className="flex gap-5">
          {/* Cover */}
          <div className="flex-shrink-0 w-32">
            {cover ? (
              <img src={cover} alt={entry.title} className="w-full rounded-lg" />
            ) : (
              <div className="w-full aspect-[2/3] bg-zinc-800 rounded-lg" />
            )}
          </div>

          {/* Metadata */}
          <div className="flex-1 min-w-0 space-y-3">
            {releaseYear && (
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-zinc-500 uppercase tracking-wider w-20 flex-shrink-0">Year</span>
                <span className="text-sm text-zinc-300">{releaseYear}</span>
              </div>
            )}
            {genres.length > 0 && (
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-zinc-500 uppercase tracking-wider w-20 flex-shrink-0">Genres</span>
                <div className="flex flex-wrap gap-1.5">
                  {genres.map((g) => (
                    <span key={g} className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {platforms.length > 0 && (
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-zinc-500 uppercase tracking-wider w-20 flex-shrink-0">Platforms</span>
                <div className="flex flex-wrap gap-1.5">
                  {platforms.map((p) => (
                    <span key={p} className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {summary && (
          <div className="mt-4">
            <span className="text-xs text-zinc-500 uppercase tracking-wider block mb-1">Summary</span>
            <p className="text-sm text-zinc-400 leading-relaxed">{summary}</p>
          </div>
        )}

        {/* Status & Rating */}
        <div className="border-t border-zinc-800 mt-5 pt-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 uppercase tracking-wider w-20 flex-shrink-0">Status</span>
            <div className="relative">
              <select
                value={entry.status}
                onChange={(e) =>
                  updateEntry.mutate({ status: e.target.value as EntryStatus })
                }
                className="bg-zinc-950 border border-zinc-700 rounded px-3 pr-8 py-1.5 text-sm text-zinc-300 focus:outline-none focus:border-zinc-500 appearance-none"
              >
                {Object.keys(STATUS_OPTIONS).map((key) => (
                  <option key={key} value={key}>
                    {statusLabel(key)}
                  </option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 uppercase tracking-wider w-20 flex-shrink-0">Rating</span>
            <StarRating
              value={entry.rating}
              onChange={(v) => updateEntry.mutate({ rating: v })}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
