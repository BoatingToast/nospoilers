import type { PersonalityType } from '@/types'
import { getPersonalityIcon } from '@/components/icons'

interface Props {
  primary:   PersonalityType
  secondary: PersonalityType | null
  compact?:  boolean
}

export default function PersonalityBadge({ primary, secondary, compact = false }: Props) {
  const PrimaryIcon = getPersonalityIcon(primary.slug)
  const SecondaryIcon = secondary ? getPersonalityIcon(secondary.slug) : null

  return (
    <div className={`flex h-full flex-col overflow-hidden rounded-2xl bg-ns-surface ${primary.color}`}>
      <div className={`flex-1 ${compact ? 'p-5' : 'p-6 sm:p-8'}`}>
        <PrimaryIcon size={compact ? 24 : 32} className="text-ns-text" />
        <p className={`text-sm text-ns-muted ${compact ? 'mt-3' : 'mt-6'}`}>Primary personality</p>
        <h3 className={`mt-1 break-words font-display text-ns-text ${compact ? 'text-xl sm:text-2xl' : 'text-3xl sm:text-4xl'}`}>
          {primary.name}
        </h3>
        {!compact && (
          <>
            <p className="mt-3 max-w-md text-base leading-relaxed text-ns-muted">
              {primary.description}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {primary.traits.map(t => (
                <span key={t} className="rounded-full bg-ns-surface-2 px-3 py-1 text-sm font-medium text-ns-text">
                  {t}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {secondary && SecondaryIcon && (
        <div className={`flex items-center gap-2 border-t border-ns-border ${compact ? 'px-5 py-3' : 'px-6 py-4 sm:px-8'}`}>
          <SecondaryIcon size={16} className="flex-shrink-0 text-ns-muted" />
          <p className="min-w-0 truncate text-sm text-ns-muted">
            Secondary: <span className="font-semibold text-ns-text">{secondary.name}</span>
          </p>
        </div>
      )}
    </div>
  )
}
