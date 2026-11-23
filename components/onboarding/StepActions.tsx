import Button from '@/components/ui/Button'
import { ArrowRightIcon } from '@/components/icons'

interface StepActionsProps {
  /** Short live status, such as how many items are selected. */
  status?: React.ReactNode
  nextLabel: string
  onNext: () => void
  onBack?: () => void
  nextDisabled?: boolean
  loading?: boolean
}

/** Sticky action bar so the next step stays in reach on long screens. */
export default function StepActions({ status, nextLabel, onNext, onBack, nextDisabled, loading }: StepActionsProps) {
  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-10 border-t border-ns-border bg-ns-bg px-4 py-3 sm:-mx-6 sm:px-6">
      <div className="flex items-center gap-3">
        {onBack && (
          <Button variant="ghost" onClick={onBack} className="flex-shrink-0">
            <ArrowRightIcon size={16} className="rotate-180" />
            Back
          </Button>
        )}
        {status && <p aria-live="polite" className="min-w-0 flex-1 text-sm text-ns-muted">{status}</p>}
        <Button
          size="lg"
          onClick={onNext}
          disabled={nextDisabled}
          loading={loading}
          className="ml-auto flex-shrink-0 whitespace-nowrap"
        >
          {nextLabel}
          <ArrowRightIcon size={16} />
        </Button>
      </div>
    </div>
  )
}
