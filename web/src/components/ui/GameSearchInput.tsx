import { useState, useEffect, useRef, useCallback } from 'react'
import api from '../../api/client'
import type { GameSearchResult } from '../../types/api'

interface Props {
  onSelect: (result: GameSearchResult) => void
}

export default function GameSearchInput({ onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GameSearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
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

  function handleSelect(result: GameSearchResult) {
    onSelect(result)
    setQuery('')
    setResults([])
    setOpen(false)
    setActiveIndex(-1)
  }

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
      handleSelect(results[activeIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
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
                  handleSelect(r)
                }}
                onMouseEnter={() => setActiveIndex(i)}
              >
                <div className="flex-shrink-0 w-8 h-11 bg-zinc-700 rounded overflow-hidden">
                  {r.cover_url ? (
                    <img
                      src={r.cover_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-zinc-700" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{r.title}</p>
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
  )
}
