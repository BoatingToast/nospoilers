interface WhoWouldEnjoyProps {
  wouldEnjoy: string[]
  mightNotEnjoy: string[]
}

export default function WhoWouldEnjoy({ wouldEnjoy, mightNotEnjoy }: WhoWouldEnjoyProps) {
  return (
    <div className="bg-ns-surface border border-ns-border rounded-2xl p-6">
      <p className="text-ns-muted text-xs tracking-widest uppercase font-body mb-4">Who would enjoy this</p>
      <div className="grid sm:grid-cols-2 gap-6">
        {wouldEnjoy.length > 0 && (
          <div>
            <p className="text-ns-gold text-xs font-body font-semibold mb-2 uppercase tracking-wider">
              Recommended for
            </p>
            <ul className="flex flex-col gap-2">
              {wouldEnjoy.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-ns-text text-sm font-body">
                  <span className="text-ns-gold mt-0.5 flex-shrink-0">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
        {mightNotEnjoy.length > 0 && (
          <div>
            <p className="text-ns-muted text-xs font-body font-semibold mb-2 uppercase tracking-wider">
              May not appeal to
            </p>
            <ul className="flex flex-col gap-2">
              {mightNotEnjoy.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-ns-muted text-sm font-body">
                  <span className="mt-0.5 flex-shrink-0">–</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
