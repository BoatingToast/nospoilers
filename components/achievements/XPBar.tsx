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
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-display text-xl tracking-wider text-ns-gold">LVL {level.level}</span>
          <span className="text-ns-muted text-xs font-body">{level.title}</span>
        </div>
        <span className="text-ns-muted/50 text-[10px] font-body">{level.totalXP} XP</span>
      </div>

      <div className="h-2 bg-ns-border rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-ns-gold to-amber-400 rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {level.progress < 100 && (
        <p className="text-ns-muted/50 text-[10px] font-body">
          {level.currentXP} / {level.maxXP - level.minXP} XP to Level {level.level + 1}
        </p>
      )}
    </div>
  )
}
