const STEPS = ['Favorite movies', 'Your genres', 'Your preferences']

interface OnboardingProgressProps {
  currentStep: number
  /** How much of the current step is complete, from 0 to 1. */
  stepProgress?: number
}

export default function OnboardingProgress({ currentStep, stepProgress = 1 }: OnboardingProgressProps) {
  return (
    <nav aria-label="Onboarding progress">
      <ol className="grid grid-cols-3 gap-2 sm:gap-3">
        {STEPS.map((label, index) => {
          const step = index + 1
          const done = step < currentStep
          const active = step === currentStep
          const fill = done ? 1 : active ? Math.min(1, Math.max(0.06, stepProgress)) : 0

          return (
            <li key={label} aria-current={active ? 'step' : undefined}>
              <div className="h-1.5 overflow-hidden rounded-full bg-ns-surface-2">
                <div
                  className="h-full origin-left rounded-full bg-ns-secondary transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none"
                  style={{ transform: `scaleX(${fill})` }}
                />
              </div>
              <span className={`mt-2 block text-xs font-semibold transition-colors duration-300 sm:text-sm ${active ? 'text-ns-text' : 'text-ns-muted'}`}>
                <span className="sr-only">{done ? 'Completed: ' : active ? 'Current: ' : 'Upcoming: '}</span>
                {label}
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
