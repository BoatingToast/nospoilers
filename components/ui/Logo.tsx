import Link from 'next/link'
import { cn } from '@/lib/utils'

interface LogoProps {
  href?: string
  className?: string
}

/** Wordmark: "Spoilers" sits inside the product's redaction bar. */
export default function Logo({ href = '/', className }: LogoProps) {
  return (
    <Link
      href={href}
      className={cn('inline-flex min-h-10 flex-shrink-0 items-center font-display text-xl leading-none text-ns-text', className)}
    >
      <span>No</span>
      <span className="ml-1 rounded-md bg-ns-secondary px-2 py-1 text-ns-secondary-foreground">Spoilers</span>
    </Link>
  )
}
