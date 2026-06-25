'use client'

import { useState, useEffect } from 'react'
import Link   from 'next/link'
import Avatar from '@/components/ui/Avatar'
import { FriendsIcon, CheckIcon } from '@/components/icons'

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
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-ns-surface border border-ns-border rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-ns-border flex-shrink-0">
          <div className="flex items-center gap-1">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-body transition-colors
                  ${tab === t.key
                    ? 'bg-ns-gold/15 text-ns-gold border border-ns-gold/30'
                    : 'text-ns-muted hover:text-ns-text'
                  }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            onClick={onClose}
            className="text-ns-muted/60 hover:text-ns-text transition-colors w-7 h-7 flex items-center justify-center rounded-lg hover:bg-ns-bg/50"
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
            <div className="flex flex-col items-center justify-center py-12 text-center px-6">
              <p className="text-ns-muted/50 font-body text-sm">
                {tab === 'followers' ? 'No followers yet' :
                 tab === 'following' ? 'Not following anyone yet' :
                 'No friends yet — follow each other to become friends'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-ns-border/30">
              {users.map(u => (
                <div key={u.id} className="flex items-center gap-3 px-5 py-3 hover:bg-ns-bg/30 transition-colors">
                  <Avatar src={u.avatarUrl} username={u.username} size="sm" href />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/profile/${u.username}`}
                        onClick={onClose}
                        className="text-sm font-body font-medium text-ns-text hover:text-ns-gold transition-colors"
                      >
                        @{u.username}
                      </Link>
                      {u.isFriend && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-body
                                         text-ns-gold/80 bg-ns-gold/10 border border-ns-gold/20
                                         px-1.5 py-0.5 rounded-full">
                          <FriendsIcon size={9} />
                          Friends
                        </span>
                      )}
                    </div>
                    {u.personality && (
                      <p className="text-[10px] font-body text-ns-muted/60">
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
                    <span className="text-[10px] font-body text-ns-muted/50 flex-shrink-0">Following</span>
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
  if (done) return <span className="text-[10px] font-body text-ns-gold/70 flex-shrink-0">✓ Following</span>
  return (
    <button
      onClick={follow}
      className="flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-body font-semibold
                 bg-ns-gold/10 text-ns-gold border border-ns-gold/30 hover:bg-ns-gold hover:text-black
                 transition-all duration-200"
    >
      + Follow
    </button>
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
      <div className="flex items-center gap-6 flex-wrap">
        {stats.map(s => (
          <button
            key={s.key}
            onClick={() => setModal(s.key)}
            className="text-left group"
          >
            <p className="font-display text-3xl tracking-wider text-ns-gold group-hover:text-amber-400 transition-colors">
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
