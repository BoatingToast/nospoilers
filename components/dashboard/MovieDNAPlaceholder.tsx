export default function MovieDNAPlaceholder() {
  const traits = [
    { label: 'Genre Affinity',     value: 'Needs more data' },
    { label: 'Decade Preference',  value: 'Needs more data' },
    { label: 'Mood Profile',       value: 'Needs more data' },
    { label: 'Director Taste',     value: 'Needs more data' },
  ]

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h2 className="font-display text-2xl tracking-wider text-ns-text">MOVIE DNA</h2>
        <span className="px-2 py-0.5 rounded-full bg-ns-gold/10 border border-ns-gold/20
                         text-ns-gold text-xs font-body tracking-wider uppercase">
          Coming Soon
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {traits.map(trait => (
          <div
            key={trait.label}
            className="p-5 rounded-2xl bg-ns-surface border border-ns-border"
          >
            <p className="text-ns-muted text-xs uppercase tracking-widest font-body mb-3">
              {trait.label}
            </p>
            <div className="h-2 bg-ns-border rounded-full overflow-hidden">
              <div className="h-full w-0 bg-ns-gold/30 rounded-full" />
            </div>
            <p className="text-ns-muted/50 text-xs font-body mt-2">{trait.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
