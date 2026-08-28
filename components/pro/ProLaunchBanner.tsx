import Link from 'next/link'

export default function ProLaunchBanner() {
  return (
    <aside className="fixed inset-x-0 top-0 z-[60] flex h-8 items-center justify-center border-b border-ns-secondary/30 bg-ns-secondary px-3 text-white shadow-lg shadow-black/20">
      <Link
        href="/pro"
        className="group flex min-w-0 items-center justify-center gap-2 text-center text-[11px] font-heading font-semibold tracking-wide sm:text-xs"
        aria-label="NoSpoilers Pro is in private beta at $4.99 per month at launch. Join the waitlist."
      >
        <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.16em]">
          Private beta
        </span>
        <span className="truncate">
          NoSpoilers Pro <span className="hidden sm:inline">· </span>
          <span className="hidden sm:inline">$4.99/month at launch</span>
        </span>
        <span className="whitespace-nowrap text-white/80 transition-colors group-hover:text-white">
          Join waitlist <span aria-hidden="true">→</span>
        </span>
      </Link>
    </aside>
  )
}
