'use client'

import { PinIcon } from '@/components/icons'
import type { SZMessageData } from '@/types'

interface Props {
  pinned: SZMessageData[]
  onJump: (id: string) => void
}

export default function PinnedMessages({ pinned, onJump }: Props) {
  if (pinned.length === 0) return null

  return (
    <div className="max-h-28 flex-shrink-0 divide-y divide-ns-border overflow-y-auto border-t border-ns-border">
      {pinned.map((msg, i) => (
        <button
          key={msg.id}
          type="button"
          onClick={() => onJump(msg.id)}
          className="group flex min-h-11 w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-ns-surface-2 sm:px-6"
        >
          <PinIcon size={14} className="flex-shrink-0 text-ns-secondary-readable" />
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold text-ns-muted">
              {msg.pinnedLabel ?? 'Pinned message'}
              {pinned.length > 1 && <span className="ml-1 tabular-nums">#{i + 1}</span>}
            </span>
            <span className="block truncate text-sm text-ns-muted transition-colors group-hover:text-ns-text">
              <span className="font-semibold text-ns-text">@{msg.username}</span>
              {': '}
              {msg.viewerUnlocked ? msg.content.slice(0, 100) : 'Locked by your Plot Passport'}
              {msg.viewerUnlocked && msg.content.length > 100 && '…'}
            </span>
          </span>
        </button>
      ))}
    </div>
  )
}
