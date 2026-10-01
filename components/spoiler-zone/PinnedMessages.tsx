'use client'

import type { SZMessageData } from '@/types'

interface Props {
  pinned: SZMessageData[]
  onJump: (id: string) => void
}

export default function PinnedMessages({ pinned, onJump }: Props) {
  if (pinned.length === 0) return null

  return (
    <div className="flex-shrink-0 border-b border-ns-border">
      {pinned.map((msg, i) => (
        <button
          key={msg.id}
          onClick={() => onJump(msg.id)}
          className="group block w-full min-w-0 border-t border-ns-border py-2 text-left first:border-t-0"
        >
          <span className="block font-body text-[11px] uppercase tracking-widest text-ns-muted">
            {msg.pinnedLabel ?? 'Pinned Message'}
            {pinned.length > 1 && <span className="ml-1">#{i + 1}</span>}
          </span>
          <span className="block truncate font-body text-xs text-ns-muted transition-colors group-hover:text-ns-text">
            <span className="font-medium text-ns-secondary-readable">@{msg.username}</span>
            {': '}
            {msg.viewerUnlocked ? msg.content.slice(0, 100) : 'Locked by your Plot Passport'}
            {msg.viewerUnlocked && msg.content.length > 100 && '…'}
          </span>
        </button>
      ))}
    </div>
  )
}
