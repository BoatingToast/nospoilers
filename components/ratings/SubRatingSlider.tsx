'use client'

import { CloseIcon, type IconProps } from '@/components/icons'

interface Props {
  label:    string
  Icon?:    React.ComponentType<IconProps>
  value:    number | null
  onChange: (v: number | null) => void
}

const COLORS = ['#9B6DC8','#C87B6D','#7B9CC8','#6DBF91','#6DBF91','#C8963E']

function barColor(v: number) {
  const idx = Math.round(((v - 1) / 9) * 5)
  return COLORS[Math.min(5, Math.max(0, idx))]
}

export default function SubRatingSlider({ label, Icon, value, onChange }: Props) {
  const display = value ?? 5

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-ns-muted text-xs font-body flex items-center gap-1.5">
          {Icon && <Icon size={13} className="opacity-60" />}
          {label}
        </span>
        <div className="flex items-center gap-2">
          {value !== null && (
            <button
              onClick={() => onChange(null)}
              className="text-ns-muted/40 hover:text-ns-muted transition-colors"
              title="Clear"
            >
              <CloseIcon size={10} />
            </button>
          )}
          <span className="text-ns-text text-xs font-body w-5 text-right"
                style={{ color: value !== null ? barColor(display) : '#52506A' }}>
            {value !== null ? value : '—'}
          </span>
        </div>
      </div>

      {/* Track */}
      <div className="relative h-1.5 rounded-full bg-ns-surface cursor-pointer group"
        onClick={e => {
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
          const pct  = (e.clientX - rect.left) / rect.width
          onChange(Math.max(1, Math.min(10, Math.round(pct * 9 + 1))))
        }}
      >
        {/* Fill */}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-150"
          style={{
            width:      value !== null ? `${((value - 1) / 9) * 100}%` : '0%',
            background: value !== null ? barColor(value) : 'transparent',
          }}
        />
        {/* Tick marks */}
        {Array.from({ length: 10 }, (_, i) => (
          <div
            key={i}
            className="absolute top-1/2 -translate-y-1/2 w-0.5 h-2.5 rounded-full opacity-20 bg-white"
            style={{ left: `${(i / 9) * 100}%` }}
          />
        ))}
      </div>

      {/* Quick 1–10 buttons */}
      <div className="flex gap-0.5">
        {Array.from({ length: 10 }, (_, i) => {
          const v = i + 1
          const isActive = value === v
          return (
            <button
              key={v}
              onClick={() => onChange(isActive ? null : v)}
              className="flex-1 h-5 rounded text-[9px] font-body transition-all duration-100"
              style={{
                background: isActive ? barColor(v) : '#0C0C18',
                color:      isActive ? '#07070F'   : '#52506A',
                border:     `1px solid ${isActive ? barColor(v) : '#1E1D2F'}`,
              }}
            >
              {v}
            </button>
          )
        })}
      </div>
    </div>
  )
}
