import Section from '@/components/ui/Section'

interface WhoWouldEnjoyProps {
  wouldEnjoy: string[]
  mightNotEnjoy: string[]
}

export default function WhoWouldEnjoy({ wouldEnjoy, mightNotEnjoy }: WhoWouldEnjoyProps) {
  return (
    <Section title="Who would enjoy this">
      <div className="grid gap-8 sm:grid-cols-2">
        {wouldEnjoy.length > 0 && (
          <div className="min-w-0">
            <p className="mb-2 font-body text-xs font-semibold uppercase tracking-wider text-ns-secondary-readable">
              Recommended for
            </p>
            <ul>
              {wouldEnjoy.map((item, i) => (
                <li key={i} className="flex items-start gap-2 border-t border-ns-border py-3 font-body text-sm text-ns-text">
                  <span className="flex-shrink-0 text-ns-secondary-readable" aria-hidden="true">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
        {mightNotEnjoy.length > 0 && (
          <div className="min-w-0">
            <p className="mb-2 font-body text-xs font-semibold uppercase tracking-wider text-ns-muted">
              May not appeal to
            </p>
            <ul>
              {mightNotEnjoy.map((item, i) => (
                <li key={i} className="flex items-start gap-2 border-t border-ns-border py-3 font-body text-sm text-ns-muted">
                  <span className="flex-shrink-0" aria-hidden="true">–</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Section>
  )
}
