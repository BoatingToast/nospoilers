import type { PersonalityType } from '@/types'

interface Props {
  primary:   PersonalityType
  secondary: PersonalityType | null
  compact?:  boolean
}

export default function PersonalityBadge({ primary, secondary, compact = false }: Props) {
  return (
    <div className="min-w-0">
      {/* Primary type */}
      <div>
        <p className="text-ns-muted text-[11px] tracking-widest uppercase font-body mb-1">
          Primary Personality
        </p>
        <h3
          className={`font-display leading-none tracking-wide text-ns-text ${compact ? 'text-2xl' : 'text-4xl sm:text-5xl'}`}
          style={{ color: primary.accentHex }}
        >
          <span aria-hidden="true" className="mr-2">{primary.icon}</span>
          {primary.name}
        </h3>
        {!compact && (
          <p className="mt-3 max-w-xl text-sm font-body leading-relaxed text-ns-muted">
            {primary.description}
          </p>
        )}
      </div>

      {/* Traits */}
      {!compact && (
        <p className="mt-4 border-t border-ns-border pt-3 text-sm font-body leading-relaxed text-ns-text">
          {primary.traits.join(' · ')}
        </p>
      )}

      {/* Secondary type */}
      {secondary && (
        <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-ns-border pt-3">
          <p className="text-ns-muted text-[11px] tracking-widest uppercase font-body">
            Secondary
          </p>
          <p className="text-sm font-body text-ns-text">
            <span aria-hidden="true" className="mr-1.5">{secondary.icon}</span>
            {secondary.name}
          </p>
        </div>
      )}
    </div>
  )
}
