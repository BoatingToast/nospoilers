const STEPS = ['Favorite Movies', 'Your Genres', 'Your Preferences']

export default function OnboardingProgress({ currentStep }: { currentStep: number }) {
  return (
    <ol className="mb-10 grid w-full min-w-0 grid-cols-3 gap-x-3 sm:gap-x-6">
      {STEPS.map((label, i) => {
        const step = i + 1
        const done    = step < currentStep
        const active  = step === currentStep
        return (
          <li
            key={step}
            aria-current={active ? 'step' : undefined}
            className={`min-w-0 border-t-2 pt-2 transition-colors
                        ${active ? 'border-ns-secondary' : done ? 'border-ns-text' : 'border-ns-border'}`}
          >
            <span className={`block font-display text-2xl leading-none tracking-wide
                             ${active ? 'text-ns-secondary-readable' : done ? 'text-ns-text' : 'text-ns-muted'}`}>
              {done ? (
                <svg aria-hidden="true" className="inline-block" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              ) : step}
            </span>
            <span className={`mt-1 block text-xs font-body leading-snug
                             ${active ? 'text-ns-text' : 'text-ns-muted'}`}>
              {label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
