'use client'

/**
 * ScoreDial — arc-gauge number input for 1-100 scores.
 * Drag the arc or click ±/type directly.
 */

import { useRef, useCallback } from 'react'
import { ratingColor } from '@/lib/theme'

interface Props {
  value: number
  onChange: (v: number) => void
  size?: number
  readOnly?: boolean
}

function scoreLabel(v: number): string {
  if (v >= 90) return 'Masterpiece'
  if (v >= 80) return 'Loved it'
  if (v >= 70) return 'Really good'
  if (v >= 60) return 'Liked it'
  if (v >= 50) return 'Decent'
  if (v >= 40) return 'Mixed'
  if (v >= 30) return 'Weak'
  if (v >= 20) return 'Disliked'
  if (v >= 10) return 'Bad'
  return 'Terrible'
}

const stepButtonClass = 'flex h-11 w-11 items-center justify-center rounded-full bg-ns-surface-2 text-lg font-semibold text-ns-text transition-colors duration-150 hover:bg-ns-surface-3'

export default function ScoreDial({ value, onChange, size = 160, readOnly = false }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)

  const cx = size / 2
  const cy = size / 2
  const R  = size / 2 - 14   // radius
  const strokeW = 10

  // Arc: starts at 135° (bottom-left), sweeps 270° clockwise
  const START_DEG  = 135
  const SWEEP_DEG  = 270
  const pct        = (value - 1) / 99
  const angleDeg   = START_DEG + pct * SWEEP_DEG

  function polarToXY(deg: number) {
    const rad = (deg - 90) * (Math.PI / 180)
    return { x: cx + R * Math.cos(rad), y: cy + R * Math.sin(rad) }
  }

  function describeArc(startDeg: number, endDeg: number) {
    const s = polarToXY(startDeg)
    const e = polarToXY(endDeg)
    const largeArc = endDeg - startDeg > 180 ? 1 : 0
    return `M ${s.x} ${s.y} A ${R} ${R} 0 ${largeArc} 1 ${e.x} ${e.y}`
  }

  const trackPath  = describeArc(START_DEG, START_DEG + SWEEP_DEG)
  const fillPath   = value > 1 ? describeArc(START_DEG, angleDeg) : ''
  const thumb      = polarToXY(angleDeg)
  const color      = ratingColor(value / 100)

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (readOnly || !(e.buttons & 1)) return
    const rect = svgRef.current!.getBoundingClientRect()
    const dx = e.clientX - rect.left - cx
    const dy = e.clientY - rect.top  - cy
    let deg  = Math.atan2(dy, dx) * (180 / Math.PI) + 90
    if (deg < 0) deg += 360
    // Map angle → value
    // START_DEG (135°) = 1, START_DEG+270° (45°+360=405) = 100
    let relative = deg - START_DEG
    if (relative < 0) relative += 360
    if (relative > SWEEP_DEG + 15) return   // dead-zone (bottom gap)
    relative = Math.max(0, Math.min(SWEEP_DEG, relative))
    const newVal = Math.round(1 + (relative / SWEEP_DEG) * 99)
    onChange(newVal)
  }, [readOnly, cx, onChange])

  return (
    <div className="flex select-none flex-col items-center gap-2">
      <svg
        ref={svgRef}
        width={size} height={size}
        viewBox={`0 0 ${size} ${size}`}
        role={readOnly ? 'img' : undefined}
        aria-label={readOnly ? `Score ${value} out of 100` : undefined}
        aria-hidden={readOnly ? undefined : true}
        className={readOnly ? '' : 'cursor-pointer touch-none'}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerMove}
      >
        <path d={trackPath} fill="none" stroke="rgb(var(--ns-surface-3))" strokeWidth={strokeW} strokeLinecap="round" />
        {fillPath && (
          <path d={fillPath} fill="none" stroke={color} strokeWidth={strokeW} strokeLinecap="round" />
        )}
        {!readOnly && (
          <circle cx={thumb.x} cy={thumb.y} r={9} fill="rgb(var(--ns-text))" stroke={color} strokeWidth={3} />
        )}
        <text
          x={cx} y={cy + size * 0.04}
          textAnchor="middle"
          fill="rgb(var(--ns-text))"
          fontSize={size * 0.27}
          className="font-display tabular-nums"
        >
          {value}
        </text>
        <text
          x={cx} y={cy + size * 0.17}
          textAnchor="middle"
          fill="rgb(var(--ns-muted))"
          fontSize={Math.max(12, size * 0.08)}
          className="font-body"
        >
          /100
        </text>
      </svg>

      <span key={scoreLabel(value)} className="animate-fade-up text-sm font-semibold" style={{ color }}>
        {scoreLabel(value)}
      </span>

      {!readOnly && (
        <div className="mt-1 flex items-center gap-2">
          <button
            type="button"
            aria-label="Decrease score"
            onClick={() => onChange(Math.max(1, value - 1))}
            className={stepButtonClass}
          >
            <span aria-hidden="true">−</span>
          </button>
          <input
            type="number" min={1} max={100} value={value}
            aria-label="Score from 1 to 100"
            onChange={e => {
              const v = parseInt(e.target.value, 10)
              if (!isNaN(v)) onChange(Math.min(100, Math.max(1, v)))
            }}
            className="min-h-11 w-20 rounded-xl border border-ns-border-strong bg-ns-bg text-center text-base tabular-nums text-ns-text transition-colors duration-150 focus:border-ns-text focus:outline-none focus:ring-1 focus:ring-ns-text"
          />
          <button
            type="button"
            aria-label="Increase score"
            onClick={() => onChange(Math.min(100, value + 1))}
            className={stepButtonClass}
          >
            <span aria-hidden="true">+</span>
          </button>
        </div>
      )}
    </div>
  )
}
