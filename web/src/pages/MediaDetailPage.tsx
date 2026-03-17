import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import StarRating from '../components/ui/StarRating'
import api from '../api/client'
import type { EntryWithMedia, EntryStatus, Collection } from '../types/api'

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

const REVIEW_MAX_LENGTH = 5000

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

export default function MediaDetailModal({ entry: initialEntry, type, onClose }: Props) {
  const qc = useQueryClient()
  const [entry, setEntry] = useState(initialEntry)
  const [reviewText, setReviewText] = useState(entry.review ?? '')
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [addingToCollection, setAddingToCollection] = useState(false)
  const [selectedCollection, setSelectedCollection] = useState('')

  const { data: memberCollections = [] } = useQuery<Collection[]>({
    queryKey: ['media-collections', entry.media_item_id],
    queryFn: () => api.get(`/media/${entry.media_item_id}/collections`).then((r) => r.data),
  })

  const { data: allCollections = [] } = useQuery<Collection[]>({
    queryKey: ['collections', type],
    queryFn: () => api.get('/collections', { params: { type } }).then((r) => r.data),
    enabled: addingToCollection,
  })

  const updateEntry = useMutation({
    mutationFn: (data: Partial<EntryWithMedia>) =>
      api.patch<EntryWithMedia>(`/collections/${entry.collection_id}/entries/${entry.id}`, data).then((r) => r.data),
    onSuccess: (updated) => {
      setEntry((prev) => ({ ...prev, ...updated }))
      qc.invalidateQueries({ queryKey: ['entries', type] })
      qc.invalidateQueries({ queryKey: ['entries'] })
    },
  })

  const addToCollection = useMutation({
    mutationFn: ({ collectionId }: { collectionId: string }) =>
      api.post(`/collections/${collectionId}/entries`, { media_item_id: entry.media_item_id, status: 'want' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['media-collections', entry.media_item_id] })
      setAddingToCollection(false)
      setSelectedCollection('')
    },
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

  const memberIds = new Set(memberCollections.map((c) => c.id))
  const availableCollections = allCollections.filter((c) => !memberIds.has(c.id))

  function handleSaveReview() {
    updateEntry.mutate({ review: reviewText || null } as Partial<EntryWithMedia>)
    setShowReviewForm(false)
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto"
      >
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-medium text-white">{entry.title}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors text-sm ml-4">
            ✕
          </button>
        </div>

        <div className="flex gap-5">
          <div className="flex-shrink-0 w-32">
            {cover ? (
              <img src={cover} alt={entry.title} className="w-full rounded-lg" />
            ) : (
              <div className="w-full aspect-[2/3] bg-zinc-800 rounded-lg" />
            )}
          </div>

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

        {/* Collections this item belongs to */}
        <div className="border-t border-zinc-800 mt-5 pt-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Collections</span>
            <button
              onClick={() => setAddingToCollection(!addingToCollection)}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {addingToCollection ? 'Cancel' : '+ Add to collection'}
            </button>
          </div>
          {memberCollections.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {memberCollections.map((c) => (
                <Link
                  key={c.id}
                  to={`/collections/${c.id}`}
                  onClick={onClose}
                  className="text-xs bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded hover:bg-zinc-700 hover:text-white transition-colors"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-600">Not in any collections yet.</p>
          )}
          {addingToCollection && (
            <div className="mt-3 flex gap-2">
              <div className="relative flex-1">
                <select
                  value={selectedCollection}
                  onChange={(e) => setSelectedCollection(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 pr-8 py-1.5 text-xs text-white focus:outline-none appearance-none"
                >
                  <option value="">Select collection…</option>
                  {availableCollections.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <button
                onClick={() => selectedCollection && addToCollection.mutate({ collectionId: selectedCollection })}
                disabled={!selectedCollection || addToCollection.isPending}
                className="px-3 py-1.5 bg-white text-zinc-950 rounded text-xs font-medium disabled:opacity-40"
              >
                Add
              </button>
            </div>
          )}
        </div>

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

        {/* Review / Thoughts */}
        <div className="border-t border-zinc-800 mt-5 pt-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Review</span>
            {!showReviewForm && (
              <button
                onClick={() => setShowReviewForm(true)}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {entry.review ? 'Edit' : '+ Add review'}
              </button>
            )}
          </div>
          {showReviewForm ? (
            <div className="space-y-2">
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                maxLength={REVIEW_MAX_LENGTH}
                rows={6}
                placeholder="Write your review here…"
                className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-y"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-600">{reviewText.length}/{REVIEW_MAX_LENGTH}</span>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveReview}
                    disabled={updateEntry.isPending}
                    className="px-3 py-1 bg-white text-zinc-950 rounded text-xs font-medium disabled:opacity-40"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => { setShowReviewForm(false); setReviewText(entry.review ?? '') }}
                    className="text-xs text-zinc-500 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : entry.review ? (
            <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">{entry.review}</p>
          ) : (
            <p className="text-xs text-zinc-600">No review yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}
