'use client'

import { useEffect, useState } from 'react'

interface Props {
  score:   number
  insight: string
  reasons: string[]
}

function scoreTone(score: number): { text: string; fill: string } {
  if (score >= 80) return { text: 'text-ns-success', fill: 'bg-ns-success' }
  if (score >= 60) return { text: 'text-ns-secondary-readable', fill: 'bg-ns-secondary' }
  if (score >= 40) return { text: 'text-ns-warning', fill: 'bg-ns-warning' }
  return { text: 'text-ns-danger', fill: 'bg-ns-danger' }
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'Near perfect match'
  if (score >= 80) return 'Strong compatibility'
  if (score >= 70) return 'Good chemistry'
  if (score >= 60) return 'Decent overlap'
  if (score >= 45) return 'Different tastes'
  return 'Opposite worlds'
}

const REVEAL_DELAY_MS = 380
const COUNT_DURATION_MS = 1200

/**
 * The score starts under the brand redaction bar. The bar wipes away while the
 * number counts up and the meter fills, then the verdict and reasons follow.
 */
export default function CompatibilityScore({ score, insight, reasons }: Props) {
  const [displayed, setDisplayed] = useState(0)
  const [open, setOpen] = useState(false)
  const tone = scoreTone(score)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayed(score)
      setOpen(true)
      return
    }

    let frame = 0
    const timer = window.setTimeout(() => {
      setOpen(true)
      const start = performance.now()
      const step = (now: number) => {
        const progress = Math.min((now - start) / COUNT_DURATION_MS, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        setDisplayed(Math.round(eased * score))
        if (progress < 1) frame = requestAnimationFrame(step)
      }
      frame = requestAnimationFrame(step)
    }, REVEAL_DELAY_MS)

    return () => {
      window.clearTimeout(timer)
      cancelAnimationFrame(frame)
    }
  }, [score])

  const settle = `transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none ${
    open ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
  }`

  return (
    <section
      aria-label="Compatibility score"
      className="grid gap-8 rounded-3xl bg-ns-surface p-7 sm:p-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-center lg:gap-14 lg:p-14"
    >
      <div>
        <p className="sr-only">{score}% compatible</p>
        <p aria-hidden="true" className="font-display text-[6.5rem] leading-none tabular-nums text-ns-text sm:text-[9rem]">
          <span className="ns-redact inline-block pr-2 [&[data-open=false]_*]:!text-transparent" data-open={open}>
            {displayed}<span className="text-[0.45em] text-ns-muted transition-colors delay-[220ms] duration-150 motion-reduce:transition-none">%</span>
          </span>
        </p>
        <div aria-hidden="true" className="mt-6 h-2 overflow-hidden rounded-full bg-ns-surface-3">
          <div
            className={`h-full origin-left rounded-full transition-transform duration-[1200ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none ${tone.fill}`}
            style={{ transform: `scaleX(${open ? score / 100 : 0})` }}
          />
        </div>
      </div>

      <div>
        <h2
          className={`font-display text-3xl sm:text-4xl ${tone.text} ${settle}`}
          style={{ transitionDelay: open ? '500ms' : undefined }}
        >
          {getScoreLabel(score)}
        </h2>
        <p
          className={`mt-3 max-w-xl text-lg leading-relaxed text-ns-muted ${settle}`}
          style={{ transitionDelay: open ? '620ms' : undefined }}
        >
          {insight}
        </p>

        {reasons.length > 0 && (
          <ul className="mt-6">
            {reasons.map((reason, i) => (
              <li
                key={i}
                className={`border-t border-ns-border py-3 text-base text-ns-text ${settle}`}
                style={{ transitionDelay: open ? `${740 + Math.min(i, 5) * 90}ms` : undefined }}
              >
                {reason}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
