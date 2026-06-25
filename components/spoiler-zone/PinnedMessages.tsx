'use client'

import type { SZMessageData } from '@/types'

interface Props {
  pinned: SZMessageData[]
  onJump: (id: string) => void
}

export default function PinnedMessages({ pinned, onJump }: Props) {
  if (pinned.length === 0) return null

  return (
    <div className="border-b border-ns-border bg-ns-surface/40 px-4 py-2.5">
      <div className="flex items-start gap-2">
        {/* Pin icon */}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"
          className="text-ns-gold/60 flex-shrink-0 mt-0.5">
          <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
        </svg>
        <div className="flex-1 min-w-0">
          {pinned.map((msg, i) => (
            <button
              key={msg.id}
              onClick={() => onJump(msg.id)}
              className="block w-full text-left group"
            >
              <p className="text-[10px] font-body text-ns-muted/60 tracking-wide mb-0.5">
                {msg.pinnedLabel ?? 'Pinned Message'}
                {pinned.length > 1 && <span className="ml-1 text-ns-muted/40">#{i + 1}</span>}
              </p>
              <p className="text-xs font-body text-ns-muted group-hover:text-ns-text transition-colors truncate">
                <span className="text-ns-gold font-medium">@{msg.username}</span>
                {': '}
                {msg.content.slice(0, 100)}
                {msg.content.length > 100 && '…'}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
