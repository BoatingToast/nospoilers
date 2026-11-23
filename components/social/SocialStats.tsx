'use client'

import { useState, useEffect } from 'react'
import Link   from 'next/link'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import { CheckIcon, FriendsIcon, PlusIcon } from '@/components/icons'

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
    { key: 'friends', label: 'Friends'   },
  ]

  return (
    <Modal onClose={onClose} ariaLabel={`@${username} connections`} className="flex h-[min(36rem,calc(100dvh-2rem))] flex-col overflow-hidden">
      <div className="flex-shrink-0 border-b border-ns-border py-3 pl-3 pr-14">
        <div role="group" aria-label="Connection type" className="flex gap-1">
          {TABS.map(t => (
            <button
              key={t.key}
              type="button"
              aria-pressed={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`min-h-10 rounded-full px-3 text-sm font-semibold transition-colors duration-150 sm:px-4
                ${tab === t.key
                  ? 'bg-ns-text text-ns-bg'
                  : 'text-ns-muted hover:bg-ns-surface-2 hover:text-ns-text'
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-4 p-5">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex animate-pulse items-center gap-3">
                <div className="h-8 w-8 flex-shrink-0 rounded-full bg-ns-surface-2" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-1/3 rounded-sm bg-ns-surface-2" />
                  <div className="h-3 w-1/4 rounded-sm bg-ns-surface-2" />
                </div>
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="flex h-full animate-fade-up items-center justify-center px-6 py-12 text-center">
            <p className="max-w-xs text-base text-ns-muted">
              {tab === 'followers' ? 'No followers yet' :
               tab === 'following' ? 'Not following anyone yet' :
               'No friends yet — follow each other to become friends'}
            </p>
          </div>
        ) : (
          <div key={tab} className="animate-fade-up divide-y divide-ns-border">
            {users.map(u => (
              <div key={u.id} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-ns-surface-2">
                <Avatar src={u.avatarUrl} username={u.username} size="sm" href />
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <Link
                      href={`/profile/${u.username}`}
                      onClick={onClose}
                      className="truncate text-sm font-semibold text-ns-text transition-colors hover:text-ns-secondary-readable"
                    >
                      @{u.username}
                    </Link>
                    {u.isFriend && (
                      <Badge variant="secondary">
                        <FriendsIcon size={11} />
                        Friends
                      </Badge>
                    )}
                  </div>
                  {u.personality && (
                    <p className="truncate text-sm text-ns-muted">
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
                  <span className="flex-shrink-0 text-sm text-ns-muted">Following</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}

function MiniFollowBtn({ username }: { username: string }) {
  const [done, setDone] = useState(false)
  const follow = async () => {
    await fetch(`/api/follow/${username}`, { method: 'POST' })
    setDone(true)
  }
  if (done) {
    return (
      <span className="inline-flex flex-shrink-0 animate-fade-up items-center gap-1 text-sm font-semibold text-ns-success">
        <CheckIcon size={14} />
        Following
      </span>
    )
  }
  return (
    <button
      type="button"
      onClick={follow}
      className="inline-flex min-h-10 flex-shrink-0 items-center gap-1 rounded-full border border-ns-border-strong px-3 text-sm font-semibold text-ns-text transition-colors duration-150 hover:bg-ns-surface-3"
    >
      <PlusIcon size={14} />
      Follow
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
    { key: 'friends', label: 'Friends', value: friendCount    },
  ]

  return (
    <>
      {stats.map(s => (
        <button
          key={s.key}
          type="button"
          onClick={() => setModal(s.key)}
          className="group min-h-11 rounded-xl text-left"
        >
          <span className="block font-display text-2xl tabular-nums text-ns-text transition-colors duration-150 group-hover:text-ns-secondary-readable sm:text-3xl">
            {s.value.toLocaleString()}
          </span>
          <span className="mt-0.5 block text-sm text-ns-muted transition-colors duration-150 group-hover:text-ns-text">
            {s.label}
          </span>
        </button>
      ))}

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
