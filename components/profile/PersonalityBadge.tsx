import type { PersonalityType } from '@/types'

interface Props {
  primary:   PersonalityType
  secondary: PersonalityType | null
  compact?:  boolean
}

export default function PersonalityBadge({ primary, secondary, compact = false }: Props) {
  return (
    <div className={`bg-ns-surface border border-ns-border rounded-2xl overflow-hidden`}>
      {/* Primary type */}
      <div className={`${primary.color} border-b border-ns-border ${compact ? 'p-4' : 'p-6'}`}>
        <div className={`${compact ? 'text-3xl mb-2' : 'text-4xl mb-3'}`}>{primary.icon}</div>
        <p className="text-ns-muted text-[10px] tracking-widest uppercase font-body mb-1">
          Primary Personality
        </p>
        <h3
          className={`font-display tracking-wider text-ns-text ${compact ? 'text-2xl' : 'text-3xl'}`}
          style={{ color: primary.accentHex }}
        >
          {primary.name}
        </h3>
        {!compact && (
          <p className="text-ns-muted text-xs font-body mt-2 leading-relaxed">
            {primary.description}
          </p>
        )}
      </div>

      {/* Traits */}
      {!compact && (
        <div className="p-4 flex flex-wrap gap-2">
          {primary.traits.map(t => (
            <span
              key={t}
              className="px-2.5 py-1 rounded-full text-[11px] font-body border"
              style={{ color: primary.accentHex, borderColor: `${primary.accentHex}40`, background: `${primary.accentHex}10` }}
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Secondary type */}
      {secondary && (
        <div className="px-4 pb-4 pt-2 border-t border-ns-border">
          <p className="text-ns-muted text-[10px] tracking-widest uppercase font-body mb-1">
            Secondary
          </p>
          <div className="flex items-center gap-2">
            <span className="text-lg">{secondary.icon}</span>
            <span className="text-ns-muted text-sm font-body">{secondary.name}</span>
          </div>
        </div>
      )}
    </div>
  )
}
