import { useState, useEffect, useRef, useCallback } from 'react'
import api from '../../api/client'
import type { GameSearchResult } from '../../types/api'

interface Props {
  onSelect: (result: GameSearchResult) => void
  existingIgdbIds?: Set<number>
}

export default function GameSearchInput({ onSelect, existingIgdbIds }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GameSearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [preview, setPreview] = useState<GameSearchResult | null>(null)
  const [summaryExpanded, setSummaryExpanded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([])
      setOpen(false)
      return
    }
    setLoading(true)
    try {
      const res = await api.get<GameSearchResult[]>('/search/games', { params: { q } })
      setResults(res.data ?? [])
      setOpen(true)
      setActiveIndex(-1)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300)
    return () => clearTimeout(timer)
  }, [query, search])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      setPreview(results[activeIndex])
      setSummaryExpanded(false)
      setOpen(false)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const alreadyAdded = preview ? existingIgdbIds?.has(preview.igdb_id) ?? false : false

  function handleAdd() {
    if (!preview || alreadyAdded) return
    onSelect(preview)
    setPreview(null)
    setQuery('')
    setResults([])
  }

  return (
    <>
      <div ref={containerRef} className="relative flex-1">
        <input
          type="text"
          placeholder="Search games…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
        />
        {loading && (
          <span className="absolute right-3 top-2.5 text-zinc-500 text-xs">…</span>
        )}
        {open && results.length > 0 && (
          <ul className="absolute z-50 top-full mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden shadow-xl">
            {results.map((r, i) => (
              <li key={r.igdb_id}>
                <button
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-zinc-800 transition-colors ${
                    i === activeIndex ? 'bg-zinc-800' : ''
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    setPreview(r)
                    setSummaryExpanded(false)
                    setOpen(false)
                  }}
                  onMouseEnter={() => setActiveIndex(i)}
                >
                  <div className="flex-shrink-0 w-8 h-11 bg-zinc-700 rounded overflow-hidden">
                    {r.cover_url ? (
                      <img src={r.cover_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-zinc-700" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-white truncate">{r.title}</p>
                      {existingIgdbIds?.has(r.igdb_id) && (
                        <span className="flex-shrink-0 text-xs text-zinc-500">Added</span>
                      )}
                    </div>
                    {r.release_year > 0 && (
                      <p className="text-xs text-zinc-500">{r.release_year}</p>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Detail modal */}
      {preview && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-lg overflow-hidden">
            <div className="flex gap-5 p-6">
              {/* Cover */}
              <div className="flex-shrink-0 w-28 h-40 bg-zinc-800 rounded-lg overflow-hidden">
                {preview.cover_url ? (
                  <img src={preview.cover_url} alt={preview.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-zinc-800" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h2 className="text-white font-semibold text-lg leading-snug mb-1">{preview.title}</h2>

                {preview.release_year > 0 && (
                  <p className="text-zinc-400 text-sm mb-2">{preview.release_year}</p>
                )}

                {preview.platforms.length > 0 && (
                  <p className="text-zinc-500 text-sm mb-2">{preview.platforms.join(', ')}</p>
                )}

                {preview.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {preview.genres.map((g) => (
                      <span key={g} className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{g}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {preview.summary && (
              <div className="px-6 pb-4">
                <p className={`text-zinc-400 text-sm leading-relaxed ${summaryExpanded ? '' : 'line-clamp-3'}`}>
                  {preview.summary}
                </p>
                <button
                  onClick={() => setSummaryExpanded(!summaryExpanded)}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors mt-1 flex items-center gap-1"
                >
                  {summaryExpanded ? 'See less' : 'See more'}
                  <svg
                    className={`w-3 h-3 transition-transform ${summaryExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            )}

            <div className="flex gap-3 px-6 pb-6">
              {alreadyAdded ? (
                <span className="flex-1 text-center text-sm text-zinc-500 py-2">Already in your list</span>
              ) : (
                <button
                  onClick={handleAdd}
                  className="flex-1 bg-white text-zinc-950 rounded-lg py-2 text-sm font-medium hover:bg-zinc-100 transition-colors"
                >
                  Add to my list
                </button>
              )}
              <button
                onClick={() => setPreview(null)}
                className="flex-1 border border-zinc-700 text-zinc-400 rounded-lg py-2 text-sm hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
