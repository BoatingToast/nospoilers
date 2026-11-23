import Link from 'next/link'
import { ChevronIcon } from '@/components/icons'

/** Quiet link back to the parent screen, shown above the page title. */
export default function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="-ml-1 inline-flex min-h-11 max-w-full items-center gap-1 rounded-full pr-3 text-sm font-semibold text-ns-muted transition-colors duration-150 hover:text-ns-text"
    >
      <ChevronIcon direction="left" size={18} className="flex-shrink-0" />
      <span className="truncate">{children}</span>
    </Link>
  )
}
