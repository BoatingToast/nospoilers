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
  { value: 'liked',          Icon: ThumbUpIcon, label: 'Like', active: 'bg-ns-success/10 text-ns-success' },
  { value: 'watched',        Icon: EyeIcon, label: 'Watched', active: 'bg-ns-surface-3 text-ns-text' },
  { value: 'not_interested', Icon: ThumbDownIcon, label: 'Not for me', active: 'bg-ns-surface-3 text-ns-muted' },
  { value: 'dismissed',      Icon: CloseIcon, label: 'Dismiss', active: 'bg-ns-danger/10 text-ns-danger' },
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
    <div className="flex flex-wrap gap-1" onClick={e => e.preventDefault()}>
      {OPTIONS.map(({ value, Icon, label, active }) => (
        <button
          key={value}
          type="button"
          onClick={() => submit(value)}
          disabled={loading !== null}
          title={label}
          aria-label={label}
          aria-pressed={feedback === value}
          className={`inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-2.5 text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed ${
            feedback === value ? active : 'text-ns-muted hover:bg-ns-surface-2 hover:text-ns-text'
          } ${loading === value ? 'animate-pulse' : ''}`}
        >
          <Icon size={16} />
          <span className="hidden xl:inline">{label}</span>
        </button>
      ))}
    </div>
  )
}
