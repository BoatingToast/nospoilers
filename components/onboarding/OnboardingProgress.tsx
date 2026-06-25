const STEPS = ['Favorite Movies', 'Your Genres', 'Your Preferences']

export default function OnboardingProgress({ currentStep }: { currentStep: number }) {
  return (
    <div className="w-full max-w-lg mx-auto mb-12">
      <div className="flex items-center justify-between mb-3">
        {STEPS.map((label, i) => {
          const step = i + 1
          const done    = step < currentStep
          const active  = step === currentStep
          return (
            <div key={step} className="flex flex-col items-center gap-1.5 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold font-body
                              transition-all duration-300
                              ${done   ? 'bg-ns-gold text-ns-bg' :
                                active ? 'bg-ns-gold/20 border-2 border-ns-gold text-ns-gold' :
                                         'bg-ns-surface border border-ns-border text-ns-muted'}`}>
                {done ? (
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                ) : step}
              </div>
              <span className={`text-[10px] tracking-wider uppercase font-body transition-colors
                               ${active ? 'text-ns-gold' : done ? 'text-ns-muted' : 'text-ns-muted/40'}`}>
                {label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Track */}
      <div className="relative h-px bg-ns-border mt-1 -mx-2">
        <div
          className="absolute left-0 top-0 h-full bg-ns-gold transition-all duration-500 ease-out"
          style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
        />
      </div>
    </div>
  )
}
