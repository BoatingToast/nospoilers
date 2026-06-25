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
  { value: 'liked',          Icon: ThumbUpIcon,   label: 'Like',       active: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' },
  { value: 'watched',        Icon: EyeIcon,       label: 'Watched',    active: 'bg-ns-gold/15 border-ns-gold/40 text-ns-gold' },
  { value: 'not_interested', Icon: ThumbDownIcon, label: 'Not for me', active: 'bg-ns-muted/10 border-ns-muted/40 text-ns-muted' },
  { value: 'dismissed',      Icon: CloseIcon,     label: 'Dismiss',    active: 'bg-red-500/10 border-red-500/40 text-red-400' },
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
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-body transition-all
            ${feedback === value
              ? active
              : 'border-ns-border text-ns-muted/50 hover:border-ns-muted/30 hover:text-ns-muted'
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
