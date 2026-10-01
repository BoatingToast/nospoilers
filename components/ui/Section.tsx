import Link from 'next/link'
import { cn } from '@/lib/utils'

interface SectionProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  title: string
  /** One plain sentence under the title. Not an uppercase eyebrow. */
  note?: React.ReactNode
  /** A text link on the right of the heading row. */
  href?: string
  linkLabel?: string
  /** Anything else for the right of the heading row. */
  action?: React.ReactNode
  headingId?: string
  children?: React.ReactNode
}

/**
 * A ruled page section: heavy top rule, heading on the left, optional link on
 * the right, content below. Replaces boxed cards as the default container.
 */
export default function Section({ title, note, href, linkLabel, action, headingId, className, children, ...props }: SectionProps) {
  return (
    <section aria-labelledby={headingId} className={cn('min-w-0 border-t-2 border-ns-text pt-4', className)} {...props}>
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <div className="min-w-0">
          <h2 id={headingId} className="font-display text-3xl leading-none tracking-wide text-ns-text sm:text-4xl">{title}</h2>
          {note && <p className="mt-2 max-w-2xl font-body text-sm leading-relaxed text-ns-muted">{note}</p>}
        </div>
        {href && linkLabel && (
          <Link href={href} className="font-heading text-sm text-ns-secondary-readable underline underline-offset-4 hover:text-ns-text">
            {linkLabel}
          </Link>
        )}
        {action}
      </div>
      {children}
    </section>
  )
}
