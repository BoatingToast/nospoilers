'use client'

import { useState } from 'react'
import { ThumbUpIcon, EyeIcon, ThumbDownIcon, CloseIcon, type IconProps } from '@/components/icons'

interface Props {
  recommendationId: string
  initialFeedback?: string | null
}

interface Option {
  value:  string
  Icon:   React.ComponentType<IconProps>
  label:  string
  active: string
}

const OPTIONS: Option[] = [
  { value: 'liked',          Icon: ThumbUpIcon,   label: 'Like',       active: 'bg-ns-success/10 border-ns-success/40 text-ns-success' },
  { value: 'watched',        Icon: EyeIcon,       label: 'Watched',    active: 'bg-ns-secondary/15 border-ns-secondary/40 text-ns-secondary-readable' },
  { value: 'not_interested', Icon: ThumbDownIcon, label: 'Not for me', active: 'bg-ns-muted/10 border-ns-muted/40 text-ns-muted' },
  { value: 'dismissed',      Icon: CloseIcon,     label: 'Dismiss',    active: 'bg-ns-danger/10 border-ns-danger/40 text-ns-danger' },
]

export default function FeedbackButtons({ recommendationId, initialFeedback }: Props) {
  const [feedback, setFeedback] = useState<string | null>(initialFeedback ?? null)
  const [loading,  setLoading]  = useState<string | null>(null)

  async function submit(value: string) {
    if (feedback === value) return
    setLoading(value)
    try {
      await fetch(`/api/recommendations/${recommendationId}/feedback`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ feedback: value }),
      })
      setFeedback(value)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex gap-1.5 flex-wrap" onClick={e => e.preventDefault()}>
      {OPTIONS.map(({ value, Icon, label, active }) => (
        <button
          key={value}
          onClick={() => submit(value)}
          disabled={loading !== null}
          title={label}
          className={`flex min-h-10 min-w-10 items-center justify-center gap-1 px-2.5 py-1 rounded border text-[11px] font-body transition-colors
            ${feedback === value
              ? active
              : 'border-ns-border text-ns-muted hover:border-ns-text hover:text-ns-text'
            }
            ${loading === value ? 'opacity-50' : ''}
          `}
        >
          <Icon size={12} />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  )
}
