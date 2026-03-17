import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import PageShell from '../components/layout/PageShell'
import api from '../api/client'
import type { User, Collection } from '../types/api'

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [bio, setBio] = useState(user?.bio ?? '')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: collections = [] } = useQuery<Collection[]>({
    queryKey: ['collections'],
    queryFn: () => api.get('/collections').then((r) => r.data),
  })

  const updateProfile = useMutation({
    mutationFn: (data: { bio?: string }) =>
      api.patch<User>('/users/me', data).then((r) => r.data),
    onSuccess: (updated) => {
      setUser(updated)
      qc.invalidateQueries({ queryKey: ['me'] })
      setEditing(false)
    },
  })

  const uploadAvatar = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('avatar', file)
      return api.post<User>('/users/me/avatar', form).then((r) => r.data)
    },
    onSuccess: (updated) => {
      setUser(updated)
      qc.invalidateQueries({ queryKey: ['me'] })
    },
  })

  function handleSave() {
    updateProfile.mutate({ bio: bio || undefined })
  }

  function handleAvatarClick() {
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      uploadAvatar.mutate(file)
    }
    e.target.value = ''
  }

  const publicCollections = collections.filter((c) => c.is_public)

  return (
    <PageShell title="Profile">
      <div className="max-w-xl space-y-8">
        {/* Avatar and info */}
        <div className="flex items-start gap-6">
          <button
            onClick={handleAvatarClick}
            className="w-20 h-20 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0 relative group"
            title="Change avatar"
          >
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-600 text-2xl font-bold">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-xs font-medium">
                {uploadAvatar.isPending ? '...' : 'Edit'}
              </span>
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex-1">
            <h2 className="text-lg font-medium text-white">{user?.username}</h2>
            <p className="text-sm text-zinc-400">{user?.email}</p>
            <p className="text-xs text-zinc-600 mt-1">
              Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
            </p>
            {uploadAvatar.isError && (
              <p className="text-xs text-red-400 mt-1">Upload failed. Max 2 MB, JPEG/PNG/GIF/WebP only.</p>
            )}
            {user?.bio && !editing && (
              <p className="text-sm text-zinc-400 mt-3 whitespace-pre-wrap">{user.bio}</p>
            )}
          </div>
        </div>

        {/* Edit form */}
        {editing ? (
          <div className="space-y-4 p-5 bg-zinc-900 border border-zinc-800 rounded-lg">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Tell others about yourself…"
                className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-y"
              />
              <span className="text-xs text-zinc-600">{bio.length}/500</span>
            </div>
            {updateProfile.isError && (
              <p className="text-xs text-red-400">Failed to save.</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={updateProfile.isPending}
                className="px-4 py-2 bg-white text-zinc-950 rounded text-sm font-medium disabled:opacity-40"
              >
                {updateProfile.isPending ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setEditing(false)
                  setBio(user?.bio ?? '')
                }}
                className="text-sm text-zinc-500 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2 border border-zinc-700 text-zinc-400 rounded text-sm hover:text-white hover:border-zinc-500 transition-colors"
          >
            Edit profile
          </button>
        )}

        {/* Collections summary */}
        <div>
          <h3 className="text-sm font-medium text-zinc-400 mb-3">Your collections</h3>
          {collections.length === 0 ? (
            <p className="text-sm text-zinc-600">No collections yet.</p>
          ) : (
            <div className="space-y-1">
              {collections.map((c) => (
                <Link
                  key={c.id}
                  to={`/collections/${c.id}`}
                  className="flex items-center justify-between px-3 py-2 bg-zinc-900 border border-zinc-800 rounded hover:border-zinc-700 transition-colors"
                >
                  <span className="text-sm text-zinc-300">{c.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-600">{c.type}</span>
                    {c.is_public && <span className="text-xs text-zinc-600">public</span>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Public profile link */}
        {publicCollections.length > 0 && user && (
          <div className="border-t border-zinc-800 pt-6">
            <p className="text-xs text-zinc-500">
              Public profile:{' '}
              <Link
                to={`/u/${user.username}`}
                className="text-zinc-400 hover:text-white transition-colors underline"
              >
                /u/{user.username}
              </Link>
            </p>
          </div>
        )}
      </div>
    </PageShell>
  )
}
