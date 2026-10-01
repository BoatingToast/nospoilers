import Badge from '@/components/ui/Badge'
import Section from '@/components/ui/Section'

export default function MovieDNAPlaceholder() {
  const traits = [
    { label: 'Genre Affinity',     value: 'Needs more data' },
    { label: 'Decade Preference',  value: 'Needs more data' },
    { label: 'Mood Profile',       value: 'Needs more data' },
    { label: 'Director Taste',     value: 'Needs more data' },
  ]

  return (
    <Section
      title="MOVIE DNA"
      action={<Badge variant="secondary" className="uppercase tracking-wider">Coming Soon</Badge>}
    >
      <dl className="border-b border-ns-border">
        {traits.map(trait => (
          <div
            key={trait.label}
            className="flex items-baseline justify-between gap-4 border-t border-ns-border py-3 font-body text-sm"
          >
            <dt className="text-ns-text">{trait.label}</dt>
            <dd className="text-ns-muted">{trait.value}</dd>
          </div>
        ))}
      </dl>
    </Section>
  )
}
