'use client'

/**
 * ScoreDial — arc-gauge number input for 1-100 scores.
 * Drag the arc or click ±/type directly.
 */

import { useRef, useCallback } from 'react'

interface Props {
  value: number
  onChange: (v: number) => void
  size?: number
  readOnly?: boolean
}

function scoreColor(v: number): string {
  if (v >= 80) return '#C8963E'   // gold  — loved it
  if (v >= 60) return '#6DBF91'   // green — liked it
  if (v >= 40) return '#7B9CC8'   // blue  — mixed
  if (v >= 20) return '#C87B6D'   // orange— disliked
  return '#9B6DC8'                // purple— hated it
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
  const arcLen     = 2 * Math.PI * R

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
  const color      = scoreColor(value)

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
    <div className="flex flex-col items-center gap-2 select-none">
      <svg
        ref={svgRef}
        width={size} height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={readOnly ? '' : 'cursor-pointer'}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerMove}
      >
        {/* Track */}
        <path d={trackPath} fill="none" stroke="#1E1D2F" strokeWidth={strokeW} strokeLinecap="round" />
        {/* Fill */}
        {fillPath && (
          <path d={fillPath} fill="none" stroke={color} strokeWidth={strokeW} strokeLinecap="round"
            style={{ transition: readOnly ? 'none' : 'd 0.05s ease' }} />
        )}
        {/* Thumb */}
        {!readOnly && (
          <circle cx={thumb.x} cy={thumb.y} r={7} fill={color}
            className="drop-shadow-md" />
        )}
        {/* Score text */}
        <text x={cx} y={cy - 6} textAnchor="middle" fill={color}
          fontSize={size * 0.22} fontWeight="700" fontFamily="var(--font-bebas), sans-serif"
          letterSpacing="1">
          {value}
        </text>
        <text x={cx} y={cy + size * 0.12} textAnchor="middle" fill="#52506A"
          fontSize={size * 0.075} fontFamily="var(--font-inter), sans-serif">
          /100
        </text>
      </svg>

      {/* Label below */}
      <span className="text-xs font-body tracking-widest uppercase" style={{ color }}>
        {scoreLabel(value)}
      </span>

      {/* +/- buttons */}
      {!readOnly && (
        <div className="flex items-center gap-3 mt-1">
          <button
            onClick={() => onChange(Math.max(1,   value - 1))}
            className="w-7 h-7 rounded-full bg-ns-surface border border-ns-border text-ns-muted
                       hover:text-ns-text hover:border-ns-gold/40 transition-colors text-sm font-body"
          >−</button>
          <input
            type="number" min={1} max={100} value={value}
            onChange={e => {
              const v = parseInt(e.target.value, 10)
              if (!isNaN(v)) onChange(Math.min(100, Math.max(1, v)))
            }}
            className="w-14 text-center bg-ns-surface border border-ns-border rounded-lg
                       text-ns-text text-sm font-body py-1 focus:outline-none focus:border-ns-gold/50"
          />
          <button
            onClick={() => onChange(Math.min(100, value + 1))}
            className="w-7 h-7 rounded-full bg-ns-surface border border-ns-border text-ns-muted
                       hover:text-ns-text hover:border-ns-gold/40 transition-colors text-sm font-body"
          >+</button>
        </div>
      )}
    </div>
  )
}
