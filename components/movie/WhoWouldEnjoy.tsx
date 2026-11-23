import Panel from '@/components/ui/Panel'
import { CheckIcon } from '@/components/icons'

interface WhoWouldEnjoyProps {
  wouldEnjoy: string[]
  mightNotEnjoy: string[]
}

export default function WhoWouldEnjoy({ wouldEnjoy, mightNotEnjoy }: WhoWouldEnjoyProps) {
  return (
    <Panel className="rounded-3xl p-7 sm:p-10">
      <h2 className="font-display text-3xl text-ns-text sm:text-4xl">Who would enjoy this</h2>
      <div className="mt-7 space-y-7">
        {wouldEnjoy.length > 0 && (
          <div>
            <h3 className="font-heading text-lg font-semibold text-ns-text">Recommended for</h3>
            <ul className="mt-3 space-y-2.5">
              {wouldEnjoy.map((item, index) => (
                <li key={index} className="flex items-start gap-3 text-base leading-snug text-ns-text">
                  <CheckIcon size={16} className="mt-0.5 flex-shrink-0 text-ns-success" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
        {mightNotEnjoy.length > 0 && (
          <div className="border-t border-ns-border pt-6">
            <h3 className="font-heading text-lg font-semibold text-ns-text">May not appeal to</h3>
            <ul className="mt-3 space-y-2.5">
              {mightNotEnjoy.map((item, index) => (
                <li key={index} className="flex items-start gap-3 text-base leading-snug text-ns-muted">
                  <span aria-hidden="true" className="mt-2.5 h-0.5 w-3 flex-shrink-0 rounded-full bg-ns-subtle" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Panel>
  )
}
