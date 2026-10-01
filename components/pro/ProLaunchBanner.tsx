import Link from 'next/link'

export default function ProLaunchBanner() {
  return (
    <aside className="fixed inset-x-0 top-0 z-[60] flex h-8 items-center justify-center border-b border-ns-border bg-ns-bg px-3">
      <Link
        href="/pro/access"
        className="group flex min-w-0 items-baseline justify-center gap-2 text-center font-heading text-xs text-ns-muted"
        aria-label="NoSpoilers Pro is in private beta at $4.99 per month at launch. Join the waitlist."
      >
        <span className="truncate">
          <span className="font-semibold text-ns-text">NoSpoilers Pro</span> is in private beta
          <span className="hidden sm:inline">, $4.99 a month at launch</span>.
        </span>
        <span className="whitespace-nowrap text-ns-secondary-readable underline underline-offset-4 group-hover:text-ns-text">
          Join the waitlist
        </span>
      </Link>
    </aside>
  )
}
