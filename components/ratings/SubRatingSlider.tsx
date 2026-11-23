'use client'

import { CloseIcon, type IconProps } from '@/components/icons'
import { ratingColor } from '@/lib/theme'
import { cn } from '@/lib/utils'

interface Props {
  label:    string
  Icon?:    React.ComponentType<IconProps>
  value:    number | null
  onChange: (v: number | null) => void
}

function barColor(v: number) {
  return ratingColor((v - 1) / 9)
}

export default function SubRatingSlider({ label, Icon, value, onChange }: Props) {
  return (
    <div>
      <div className="flex min-h-11 items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-ns-text">
          {Icon && <Icon size={16} className="text-ns-muted" />}
          {label}
        </span>
        <span className="flex items-center gap-1">
          <span key={value ?? 'none'} className="animate-fade-up text-base font-bold tabular-nums text-ns-text">
            {value !== null ? value : <span className="font-normal text-ns-subtle">—</span>}
          </span>
          {value !== null && (
            <button
              type="button"
              onClick={() => onChange(null)}
              aria-label={`Clear ${label}`}
              title="Clear"
              className="flex h-11 w-11 items-center justify-center rounded-full text-ns-muted transition-colors duration-150 hover:bg-ns-surface-2 hover:text-ns-text"
            >
              <CloseIcon size={14} />
            </button>
          )}
        </span>
      </div>

      <div className="relative h-11">
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={value ?? 5}
          aria-label={label}
          aria-valuetext={value === null ? 'Not rated' : `${value} out of 10`}
          onChange={event => onChange(Number(event.target.value))}
          onPointerUp={event => { if (value === null) onChange(Number(event.currentTarget.value)) }}
          className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 gap-1 rounded-full peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-ns-text"
        >
          {Array.from({ length: 10 }, (_, index) => {
            const filled = value !== null && index < value
            return (
              <span key={index} className="relative h-2 flex-1 overflow-hidden rounded-full bg-ns-surface-3">
                <span
                  style={{ background: value !== null ? barColor(value) : undefined, transitionDelay: filled ? `${index * 16}ms` : '0ms' }}
                  className={cn(
                    'absolute inset-0 origin-left rounded-full transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]',
                    filled ? 'scale-x-100' : 'scale-x-0',
                  )}
                />
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}
