import Link from 'next/link'
import { ArrowRightIcon } from '@/components/icons'

interface SectionHeadingProps {
  id?: string
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
}

/** Title row shared by every section of the dashboard. */
export default function SectionHeading({ id, title, description, action }: SectionHeadingProps) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 id={id} className="font-display text-2xl text-ns-text sm:text-3xl">{title}</h2>
        {description && <p className="mt-1.5 max-w-2xl text-base leading-relaxed text-ns-muted">{description}</p>}
      </div>
      {action && <div className="flex flex-shrink-0 items-center gap-1">{action}</div>}
    </div>
  )
}

export function SectionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-sm font-semibold text-ns-muted transition-colors duration-150 hover:bg-ns-surface hover:text-ns-text"
    >
      {children}
      <ArrowRightIcon size={14} className="transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-0.5 motion-reduce:transform-none" />
    </Link>
  )
}
