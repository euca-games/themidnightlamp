export interface User {
  id: string
  username: string
  email: string
  created_at: string
}

export type MediaType = 'game' | 'book' | 'movie' | 'tv_show'
export type EntryStatus = 'want' | 'in_progress' | 'completed' | 'dropped'

export interface MediaItem {
  id: string
  type: MediaType
  title: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface Collection {
  id: string
  user_id: string
  name: string
  type: MediaType
  description: string | null
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface Entry {
  id: string
  collection_id: string
  media_item_id: string
  rating: number | null
  status: EntryStatus
  notes: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface EntryWithMedia extends Entry {
  title: string
  type: MediaType
  metadata: Record<string, unknown>
}

export interface GameSearchResult {
  igdb_id: number
  title: string
  cover_url: string
  release_year: number
  platforms: string[]
  summary: string
  genres: string[]
}

export interface PaginatedMedia {
  items: MediaItem[]
  total: number
  page: number
  limit: number
}
