'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

const COLLAPSE_AFTER = 420

/** Long, non-spoiler copy such as a biography. The full text stays in the DOM. */
export default function ExpandableText({ text, className }: { text: string; className?: string }) {
  const [expanded, setExpanded] = useState(false)
  const collapsible = text.length > COLLAPSE_AFTER

  return (
    <div className={className}>
      <p className={cn('whitespace-pre-line break-words text-base leading-relaxed text-ns-muted', collapsible && !expanded && 'line-clamp-5')}>
        {text}
      </p>
      {collapsible && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded(value => !value)}
          className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-ns-text underline decoration-ns-border-strong underline-offset-4 transition-colors hover:decoration-ns-text"
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  )
}
