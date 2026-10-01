'use client'

import { useEffect, useState } from 'react'

interface Props {
  score:   number
  insight: string
  reasons: string[]
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'rgb(var(--ns-success))'
  if (score >= 60) return 'rgb(var(--ns-secondary))'
  if (score >= 40) return 'rgb(var(--ns-warning))'
  return 'rgb(var(--ns-danger))'
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

  return (
    <section className="min-w-0 border-t-2 border-ns-text pt-6">
      <div className="grid min-w-0 gap-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-8">
        {/* Arc gauge */}
        <div className="relative flex h-48 w-48 items-center justify-center">
          <svg width="192" height="192" viewBox="0 0 192 192" className="absolute inset-0 -rotate-90" aria-hidden="true">
            <circle
              cx="96" cy="96" r={radius}
              fill="none" stroke="rgb(var(--ns-border))" strokeWidth="8"
            />
            <circle
              cx="96" cy="96" r={radius}
              fill="none" stroke={color} strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - (displayed / 100) * circumference}
              style={{ transition: 'stroke-dashoffset 0.05s ease-out' }}
            />
          </svg>
          <div className="relative z-10 text-center">
            <span className="font-display text-6xl tracking-wider" style={{ color }}>
              {displayed}
            </span>
            <span className="font-body text-xl text-ns-muted">%</span>
          </div>
        </div>

        <div className="min-w-0">
          {/* Label */}
          <p className="font-display text-3xl leading-none tracking-wide sm:text-4xl" style={{ color }}>
            {getScoreLabel(score)}
          </p>

          {/* Insight */}
          <p className="mt-3 max-w-xl font-body text-base leading-relaxed text-ns-text">
            {insight}
          </p>
        </div>
      </div>

      {/* Reasons */}
      {reasons.length > 0 && (
        <ul className="mt-6 border-b border-ns-border">
          {reasons.map((reason, i) => (
            <li
              key={i}
              className="border-t border-ns-border py-3 font-body text-sm leading-relaxed text-ns-muted"
            >
              {reason}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
