import Link from 'next/link'
import { ArrowRightIcon } from '@/components/icons'
import { PRO_TOOLS } from './pro-tools'

const WATCH_TOOLS = PRO_TOOLS.filter(tool => tool.slug === 'lumi' || tool.slug === 'double-feature')
const PERSONAL_TOOLS = PRO_TOOLS.filter(tool => tool.slug === 'identity' || tool.slug === 'taste-lab' || tool.slug === 'spoiler-field')

export default function ProLobby({ hasAccess }: { hasAccess: boolean }) {
  return (
    <div className="mx-auto max-w-6xl px-5 pb-12 pt-8 sm:px-8 sm:pb-16 sm:pt-12">
      <header>
        <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-ns-text/25 pb-4">
          <p className="font-heading text-sm font-medium text-ns-text">NoSpoilers <span className="ml-1 text-ns-secondary-readable">Pro</span></p>
          {hasAccess ? (
            <span className="text-xs text-ns-muted">Founding member</span>
          ) : (
            <Link href="/pro/access" className="inline-flex min-h-11 items-center gap-2 text-xs text-ns-muted underline underline-offset-4 hover:text-ns-text">Private preview · Get access <ArrowRightIcon size={13} /></Link>
          )}
        </div>
        <div className="flex flex-col gap-3 py-7 sm:flex-row sm:items-end sm:justify-between sm:gap-8 sm:py-9">
          <h1 className="font-display text-[64px] leading-[0.9] tracking-tight text-ns-text sm:text-[88px]">The lobby.</h1>
          <p className="max-w-64 text-sm leading-6 text-ns-muted sm:pb-1">Find a film, plan a double feature, or explore your movie taste.</p>
        </div>
      </header>

      <section aria-label="Plan your next watch" className="grid border-y border-ns-text/25 lg:grid-cols-[1.1fr_1fr]">
        <Link
          href="/pro/tonight"
          aria-label="Open Tonight Mode"
          className="group flex flex-col items-start bg-ns-text p-6 text-ns-bg transition-colors hover:bg-ns-primary-foreground/90 focus-visible:outline-ns-bg focus-visible:outline-offset-[-6px] sm:p-8"
        >
          <span className="text-xs font-medium">Tonight Mode / From your watchlist</span>
          <h2 className="mb-4 mt-7 font-display text-[60px] leading-[0.95] tracking-tight sm:text-[76px]">What&apos;s on<br />tonight?</h2>
          <p className="max-w-xs text-sm leading-6 text-ns-primary">Set your mood and the time you have. Pick a film from the ones you&apos;ve saved.</p>
          <span className="mt-7 inline-flex min-h-11 items-center gap-7 rounded-sm bg-ns-bg px-4 text-sm font-medium text-ns-text group-hover:bg-ns-primary">
            Find my movie <ArrowRightIcon size={17} />
          </span>
        </Link>

        <div className="grid divide-y divide-ns-text/20 lg:pl-8">
          {WATCH_TOOLS.map(({ slug, title, description, action }) => (
            <Link key={slug} href={`/pro/${slug}`} aria-label={`Open ${title}`} className="group flex flex-col items-start py-6 transition-colors hover:bg-ns-text/[0.03] sm:py-7 lg:pl-2">
              <h2 className="font-heading text-2xl font-medium tracking-tight text-ns-text">{title}</h2>
              <p className="mb-4 mt-2 max-w-sm text-sm leading-6 text-ns-muted">{description}</p>
              <span className="mt-auto inline-flex min-h-11 items-center gap-3 text-sm text-ns-text underline decoration-ns-text/30 underline-offset-[5px] group-hover:decoration-ns-text">
                {action} <ArrowRightIcon size={15} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10 sm:mt-12" aria-labelledby="pro-tools-heading">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="pro-tools-heading" className="font-heading text-lg font-medium text-ns-text">Your Pro tools</h2>
          <p className="text-xs text-ns-muted">Profile, taste &amp; spoiler controls</p>
        </div>
        <div className="border-t border-ns-text/25">
          {PERSONAL_TOOLS.map(({ slug, title, description }) => (
            <Link key={slug} href={`/pro/${slug}`} aria-label={`Open ${title}`} className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 gap-y-1 border-b border-ns-text/15 py-5 transition-colors hover:bg-ns-text/[0.03] sm:grid-cols-[minmax(0,0.65fr)_minmax(0,1fr)_auto] sm:gap-x-8">
              <h3 className="font-heading text-base font-medium text-ns-text group-hover:underline group-hover:underline-offset-4">{title}</h3>
              <p className="col-start-1 row-start-2 text-sm leading-6 text-ns-muted sm:col-start-2 sm:row-start-1">{description}</p>
              <ArrowRightIcon size={18} className="col-start-2 row-span-2 row-start-1 text-ns-muted group-hover:text-ns-text sm:col-start-3 sm:row-span-1" />
            </Link>
          ))}
        </div>
      </section>

      <Link href="/theater" aria-label="Open NoSpoilers Theater" className="group mt-8 flex flex-col items-start justify-between gap-3 border-l-2 border-ns-secondary-readable pl-5 sm:flex-row sm:items-center sm:gap-8">
        <div>
          <h2 className="font-heading text-base font-medium text-ns-text">NoSpoilers Theater</h2>
          <p className="mt-1 text-sm leading-6 text-ns-muted">Watch independent premieres with other film fans.</p>
        </div>
        <span className="inline-flex min-h-11 shrink-0 items-center gap-3 text-sm text-ns-text underline decoration-ns-text/30 underline-offset-[5px] group-hover:decoration-ns-text">Enter the theater <ArrowRightIcon size={15} /></span>
      </Link>

      {!hasAccess && (
        <p className="mt-10 border-t border-ns-text/15 pt-5 text-xs leading-6 text-ns-muted">
          Pro is in private preview.{' '}
          <Link href="/pro/access" className="inline-flex min-h-11 items-center text-ns-text underline decoration-ns-text/40 underline-offset-4 hover:decoration-ns-text">Join the waitlist for access.</Link>
        </p>
      )}
    </div>
  )
}
