import Link from 'next/link'

export default function ProLaunchBanner() {
  return (
    <aside className="fixed inset-x-0 top-0 z-[60] flex h-8 items-center justify-center border-b border-ns-border bg-ns-surface px-3">
      <Link
        href="/pro/access"
        className="group flex min-h-8 min-w-0 items-center justify-center gap-2 text-center text-xs text-ns-muted transition-colors hover:text-ns-text"
        aria-label="NoSpoilers Pro is in private beta at $4.99 per month at launch. Join the waitlist."
      >
        <span className="truncate">
          NoSpoilers Pro<span className="hidden sm:inline"> is in private beta, $4.99/month at launch</span>
        </span>
        <span className="whitespace-nowrap font-medium text-ns-secondary-readable">
          Join waitlist <span aria-hidden="true">→</span>
        </span>
      </Link>
    </aside>
  )
}
