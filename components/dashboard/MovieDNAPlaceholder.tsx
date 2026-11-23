import Badge from '@/components/ui/Badge'

const TRAITS = ['Genre Affinity', 'Decade Preference', 'Mood Profile', 'Director Taste']

export default function MovieDNAPlaceholder() {
  return (
    <section className="rounded-2xl bg-ns-surface p-6">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="font-display text-2xl text-ns-text">Movie DNA</h2>
        <Badge variant="secondary">Coming Soon</Badge>
      </div>
      <dl className="divide-y divide-ns-border">
        {TRAITS.map(trait => (
          <div key={trait} className="flex items-center justify-between gap-4 py-3">
            <dt className="text-sm font-semibold text-ns-text">{trait}</dt>
            <dd className="text-sm text-ns-muted">Needs more data</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
