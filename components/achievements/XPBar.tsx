'use client'

import { useEffect, useState } from 'react'
import type { XPLevel } from '@/types'

interface Props {
  level: XPLevel
}

export default function XPBar({ level }: Props) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setProgress(level.progress), 100)
    return () => clearTimeout(t)
  }, [level.progress])

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="font-display text-2xl leading-none tracking-wide text-ns-secondary-readable">LVL {level.level}</span>
          <span className="font-body text-sm text-ns-muted">{level.title}</span>
        </div>
        <span className="font-body text-xs tabular-nums text-ns-muted">{level.totalXP} XP</span>
      </div>

      <div className="h-1.5 overflow-hidden bg-ns-border">
        <div
          className="h-full bg-ns-secondary transition-all duration-1000 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {level.progress < 100 && (
        <p className="font-body text-xs text-ns-muted">
          {level.currentXP} / {level.maxXP - level.minXP} XP to Level {level.level + 1}
        </p>
      )}
    </div>
  )
}
