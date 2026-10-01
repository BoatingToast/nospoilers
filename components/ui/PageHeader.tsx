import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  /** Second display line in the accent color, as on the landing page. */
  accent?: string
  lede?: React.ReactNode
  /** Buttons, stats, or a search field. Sits in the ruled right-hand column. */
  children?: React.ReactNode
  /** Heading level for the title. Each page has exactly one h1. */
  as?: 'h1' | 'h2'
  id?: string
  className?: string
}

/**
 * The page opening used across NoSpoilers: a large left-aligned display title
 * beside a narrower column that starts under a heavy rule.
 */
export default function PageHeader({ title, accent, lede, children, as: Heading = 'h1', id, className }: PageHeaderProps) {
  const aside = Boolean(lede || children)
  return (
    <header
      className={cn(
        'grid min-w-0 gap-6 border-b border-ns-border pb-8 lg:items-end lg:gap-10',
        aside && 'lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]',
        className,
      )}
    >
      <Heading id={id} className="min-w-0 font-display text-[clamp(2.6rem,9vw,5.5rem)] leading-[0.88] tracking-wide text-ns-text">
        {title}
        {accent && <span className="block text-ns-secondary-readable">{accent}</span>}
      </Heading>
      {aside && (
        <div className="min-w-0 border-t-2 border-ns-text pt-4">
          {lede && <div className="font-body text-base leading-relaxed text-ns-text">{lede}</div>}
          {children && <div className={cn('flex flex-wrap items-center gap-3', Boolean(lede) && 'mt-4')}>{children}</div>}
        </div>
      )}
    </header>
  )
}
