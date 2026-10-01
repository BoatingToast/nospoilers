'use client'

import { useState, useEffect } from 'react'
import Link   from 'next/link'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserRow {
  id:          string
  username:    string
  avatarUrl:   string | null
  personality: string | null
  topGenre:    string | null
  isFriend:    boolean
  isFollowing: boolean
}

type ModalTab = 'followers' | 'following' | 'friends'

const PERSONALITY_LABELS: Record<string, string> = {
  'thinker':         'The Thinker',
  'thriller-seeker': 'Thriller Seeker',
  'explorer':        'The Explorer',
  'story-analyst':   'Story Analyst',
  'entertainer':     'The Entertainer',
  'auteur':          'The Auteur',
  'escapist':        'The Escapist',
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function SocialModal({
  username,
  initialTab,
  onClose,
}: {
  username:    string
  initialTab:  ModalTab
  onClose:     () => void
}) {
  const [tab,     setTab]    = useState<ModalTab>(initialTab)
  const [users,   setUsers]  = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/profile/${username}/social?tab=${tab}`)
      .then(r => r.ok ? r.json() : { users: [] })
      .then((d: { users: UserRow[] }) => setUsers(d.users))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false))
  }, [username, tab])

  const TABS: { key: ModalTab; label: string }[] = [
    { key: 'followers', label: 'Followers' },
    { key: 'following', label: 'Following' },
    { key: 'friends',   label: 'Friends'   },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative flex max-h-[80vh] w-full max-w-md flex-col rounded border border-ns-border border-t-2 border-t-ns-text bg-ns-surface">

        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-ns-border px-5 pt-2">
          <div className="flex items-center gap-5">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`-mb-px min-h-[44px] border-b-2 font-heading text-sm font-semibold transition-colors
                  ${tab === t.key
                    ? 'border-ns-text text-ns-text'
                    : 'border-transparent text-ns-muted hover:text-ns-text'
                  }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center text-ns-muted transition-colors hover:text-ns-text"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="space-y-3 p-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-ns-border flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-ns-border rounded w-1/3" />
                    <div className="h-2.5 bg-ns-border rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="px-5 py-8">
              <p className="font-body text-sm text-ns-muted">
                {tab === 'followers' ? 'No followers yet' :
                 tab === 'following' ? 'Not following anyone yet' :
                 'No friends yet — follow each other to become friends'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-ns-border">
              {users.map(u => (
                <div key={u.id} className="flex items-center gap-3 px-5 py-3">
                  <Avatar src={u.avatarUrl} username={u.username} size="sm" href />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Link
                        href={`/profile/${u.username}`}
                        onClick={onClose}
                        className="text-sm font-body font-medium text-ns-text hover:text-ns-secondary-readable transition-colors"
                      >
                        @{u.username}
                      </Link>
                      {u.isFriend && (
                        <Badge variant="secondary">Friends</Badge>
                      )}
                    </div>
                    {u.personality && (
                      <p className="font-body text-xs text-ns-muted">
                        {PERSONALITY_LABELS[u.personality] ?? u.personality}
                        {u.topGenre ? ` · ${u.topGenre}` : ''}
                      </p>
                    )}
                  </div>
                  {/* Follow button (mini) — not shown for self */}
                  {!u.isFollowing && !u.isFriend && (
                    <MiniFollowBtn username={u.username} />
                  )}
                  {u.isFollowing && (
                    <span className="flex-shrink-0 font-body text-xs text-ns-muted">Following</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MiniFollowBtn({ username }: { username: string }) {
  const [done, setDone] = useState(false)
  const follow = async () => {
    await fetch(`/api/follow/${username}`, { method: 'POST' })
    setDone(true)
  }
  if (done) return <span className="flex-shrink-0 font-body text-xs text-ns-secondary-readable">✓ Following</span>
  return (
    <Button variant="secondary" size="sm" onClick={follow} className="flex-shrink-0">
      + Follow
    </Button>
  )
}

// ── SocialStats ───────────────────────────────────────────────────────────────

interface Props {
  username:       string
  followerCount:  number
  followingCount: number
  friendCount:    number
  /** If provided, replace static counts with live-updating values */
  onCountChange?: (type: 'followers' | 'following' | 'friends', delta: number) => void
}

export default function SocialStats({
  username,
  followerCount,
  followingCount,
  friendCount,
}: Props) {
  const [modal, setModal] = useState<ModalTab | null>(null)

  const stats: { key: ModalTab; label: string; value: number }[] = [
    { key: 'followers', label: 'Followers', value: followerCount  },
    { key: 'following', label: 'Following', value: followingCount },
    { key: 'friends',   label: 'Friends',   value: friendCount    },
  ]

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        {stats.map(s => (
          <button
            key={s.key}
            onClick={() => setModal(s.key)}
            className="group min-h-[40px] text-left"
          >
            <p className="font-display text-3xl tracking-wider text-ns-secondary-readable transition-colors group-hover:text-ns-text">
              {s.value.toLocaleString()}
            </p>
            <p className="text-ns-muted text-xs font-body mt-0.5 group-hover:text-ns-text transition-colors">
              {s.label}
            </p>
          </button>
        ))}
      </div>

      {modal && (
        <SocialModal
          username={username}
          initialTab={modal}
          onClose={() => setModal(null)}
        />
      )}
    </>
  )
}
