'use client'

import { useEffect, useState } from 'react'

interface Props {
  score:   number
  insight: string
  reasons: string[]
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#22C55E'  // green
  if (score >= 60) return '#C8963E'  // gold
  if (score >= 40) return '#F59E0B'  // amber
  return '#EF4444'                    // red
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'Near Perfect Match'
  if (score >= 80) return 'Strong Compatibility'
  if (score >= 70) return 'Good Chemistry'
  if (score >= 60) return 'Decent Overlap'
  if (score >= 45) return 'Different Tastes'
  return 'Opposite Worlds'
}

export default function CompatibilityScore({ score, insight, reasons }: Props) {
  const [displayed, setDisplayed] = useState(0)
  const color = getScoreColor(score)

  // Animate count-up
  useEffect(() => {
    let frame: number
    const start = performance.now()
    const duration = 1200

    function step(now: number) {
      const progress = Math.min((now - start) / duration, 1)
      const eased    = 1 - Math.pow(1 - progress, 3)
      setDisplayed(Math.round(eased * score))
      if (progress < 1) frame = requestAnimationFrame(step)
    }

    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [score])

  // SVG arc
  const radius = 80
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="bg-ns-surface border border-ns-border rounded-2xl p-8 text-center">
      {/* Arc gauge */}
      <div className="flex justify-center mb-6">
        <div className="relative w-48 h-48 flex items-center justify-center">
          <svg width="192" height="192" viewBox="0 0 192 192" className="-rotate-90 absolute inset-0">
            <circle
              cx="96" cy="96" r={radius}
              fill="none" stroke="#1C1C2E" strokeWidth="8"
            />
            <circle
              cx="96" cy="96" r={radius}
              fill="none" stroke={color} strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - (displayed / 100) * circumference}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.05s ease-out' }}
            />
          </svg>
          <div className="text-center relative z-10">
            <span className="font-display text-6xl tracking-wider" style={{ color }}>
              {displayed}
            </span>
            <span className="text-ns-muted text-xl font-body">%</span>
          </div>
        </div>
      </div>

      {/* Label */}
      <p className="font-display text-2xl tracking-wider text-ns-text mb-2" style={{ color }}>
        {getScoreLabel(score)}
      </p>

      {/* Insight */}
      <p className="text-ns-muted text-sm font-body max-w-md mx-auto leading-relaxed mb-6">
        {insight}
      </p>

      {/* Reasons */}
      {reasons.length > 0 && (
        <div className="flex flex-col gap-2 max-w-sm mx-auto">
          {reasons.map((reason, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-ns-surface-2 text-ns-muted text-xs font-body"
            >
              <span style={{ color }}>✦</span>
              {reason}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
