import Link from 'next/link'
import { ArrowRightIcon, ClapperboardIcon, LockIcon, RecsIcon, WatchlistIcon } from '@/components/icons'
import { PRO_TOOLS } from './pro-tools'

export default function ProLobby({ hasAccess }: { hasAccess: boolean }) {
  return (
    <div className="relative isolate mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 bg-[radial-gradient(ellipse_at_top,rgb(var(--ns-secondary)/0.12),transparent_70%)]" />
      <header className="mb-9 sm:mb-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="rounded-lg border border-ns-secondary-readable/25 bg-ns-secondary/20 px-3 py-1.5 font-heading text-xs font-semibold tracking-[0.16em] text-ns-secondary-readable">PRO</span>
            <span className="text-xs font-heading uppercase tracking-[0.2em] text-ns-muted">The lobby</span>
          </div>
          {hasAccess ? (
            <span className="inline-flex items-center gap-2 text-xs text-ns-muted"><span className="h-1.5 w-1.5 rounded-full bg-ns-success" /> Founding member</span>
          ) : (
            <Link href="/pro/access" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-ns-secondary-readable hover:text-white">Get Pro access <ArrowRightIcon size={14} /></Link>
          )}
        </div>
        <h1 className="mt-7 font-heading text-3xl font-semibold tracking-tight text-white sm:text-5xl">A good night starts here.</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-ns-muted sm:text-base">Pick a space. Find your next film, plan a double feature, or make something your own.</p>
      </header>

      <section aria-labelledby="pro-start-heading">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="pro-start-heading" className="text-xs font-heading font-semibold uppercase tracking-[0.17em] text-ns-muted">What are you in the mood for?</h2>
          <span className="hidden text-xs text-ns-muted/75 sm:block">Your cinema, at your pace</span>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Link href="/pro/tonight" className="group relative flex min-h-[250px] items-center overflow-hidden rounded-3xl border border-ns-secondary-readable/25 bg-gradient-to-br from-ns-secondary/20 via-ns-surface to-ns-surface p-6 transition-colors hover:border-ns-secondary-readable/60 sm:p-8 lg:col-span-2" aria-label="Open Tonight Mode">
            <div className="relative z-10 max-w-sm">
              <span className="inline-flex items-center gap-2 text-xs font-medium text-ns-secondary-readable"><WatchlistIcon size={15} /> Tonight Mode</span>
              <h3 className="mt-5 font-heading text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">Less scrolling.<br />More movie night.</h3>
              <p className="mt-3 max-w-[290px] text-sm leading-6 text-ns-muted">Your time, your mood, one great pick from your watchlist.</p>
              <span className="mt-6 inline-flex min-h-11 items-center gap-3 rounded-xl bg-ns-secondary px-4 text-sm font-heading font-semibold text-white transition-colors group-hover:bg-ns-secondary/80">Find my movie <ArrowRightIcon size={15} /></span>
            </div>
            <div aria-hidden="true" className="pointer-events-none absolute -right-9 top-1/2 hidden h-56 w-56 -translate-y-1/2 sm:block lg:-right-12 xl:right-4">
              <div className="absolute inset-0 rounded-full border border-ns-secondary-readable/10" />
              <div className="absolute inset-6 rounded-full border border-ns-secondary-readable/15" />
              <div className="absolute inset-12 grid place-items-center rounded-full border border-ns-secondary-readable/25 bg-ns-secondary/15 shadow-[0_0_70px_rgb(var(--ns-secondary)/0.25)]"><ClapperboardIcon size={46} strokeWidth={1.1} className="text-ns-secondary-readable" /></div>
              <span className="absolute right-6 top-9 h-2 w-2 rounded-full bg-ns-secondary-readable" />
            </div>
          </Link>
          <Link href="/pro/lumi" className="group relative flex flex-col items-start overflow-hidden rounded-3xl border border-ns-border bg-ns-surface p-6 transition-colors hover:border-ns-secondary-readable/50 sm:p-8" aria-label="Open Lumi AI">
            <span className="grid h-12 w-12 place-items-center rounded-2xl border border-ns-secondary-readable/20 bg-ns-secondary/10 text-ns-secondary-readable"><RecsIcon size={24} strokeWidth={1.3} /></span>
            <h3 className="mt-5 font-heading text-2xl font-semibold tracking-tight text-white">Meet your movie person.</h3>
            <p className="mb-6 mt-3 text-sm leading-6 text-ns-muted">Talk it through with Lumi. A little inspiration, a great recommendation, zero plot details.</p>
            <span className="mt-auto inline-flex min-h-11 items-center gap-3 text-sm font-heading font-semibold text-ns-secondary-readable group-hover:text-white">Chat with Lumi <ArrowRightIcon size={15} /></span>
          </Link>
        </div>
      </section>

      <section className="mt-8" aria-labelledby="pro-tools-heading">
        <h2 id="pro-tools-heading" className="mb-4 text-xs font-heading font-semibold uppercase tracking-[0.17em] text-ns-muted">Make Pro your own</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PRO_TOOLS.slice(2).map(({ slug, title, description, action, Icon }) => (
            <Link key={slug} href={`/pro/${slug}`} aria-label={`Open ${title}`} className="group flex items-start gap-4 rounded-2xl border border-ns-border bg-ns-surface/70 p-5 transition-colors hover:border-ns-secondary-readable/45 hover:bg-ns-surface-2 sm:flex-col sm:gap-0">
              <Icon size={23} strokeWidth={1.4} className="mt-1 shrink-0 text-ns-secondary-readable sm:mt-0" />
              <div className="flex flex-1 flex-col sm:mt-5">
                <h3 className="font-heading text-lg font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-ns-muted sm:mb-5">{description}</p>
                <span className="mt-auto hidden min-h-10 items-center gap-2 text-xs font-heading font-semibold text-ns-secondary-readable group-hover:text-white sm:inline-flex">{action}<ArrowRightIcon size={13} /></span>
              </div>
              <ArrowRightIcon size={15} className="mt-1.5 shrink-0 text-ns-secondary-readable sm:hidden" />
            </Link>
          ))}
        </div>
      </section>

      <Link href="/theater" className="group mt-5 flex flex-col gap-5 rounded-2xl border border-ns-border bg-ns-surface/40 p-5 transition-colors hover:border-ns-secondary-readable/40 sm:flex-row sm:items-center sm:justify-between" aria-label="Open NoSpoilers Theater">
        <div className="flex items-center gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-ns-border bg-ns-bg text-ns-secondary-readable"><ClapperboardIcon size={23} /></span>
          <div><h2 className="font-heading text-base font-semibold text-white">There&apos;s a seat for you.</h2><p className="mt-1 text-sm leading-6 text-ns-muted">Discover independent premieres together in NoSpoilers Theater.</p></div>
        </div>
        <span className="inline-flex min-h-10 shrink-0 items-center gap-2 text-sm font-heading font-semibold text-ns-secondary-readable group-hover:text-white">Enter the theater <ArrowRightIcon size={14} /></span>
      </Link>

      {!hasAccess && (
        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-ns-secondary/25 bg-ns-secondary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-3 text-sm leading-6 text-ns-muted"><LockIcon size={16} className="shrink-0 text-ns-secondary-readable" /> Pro tools are in private preview. Join the founding list for access.</p>
          <Link href="/pro/access" className="inline-flex min-h-11 shrink-0 items-center gap-2 text-sm font-semibold text-ns-secondary-readable hover:text-white">Join the waitlist <ArrowRightIcon size={14} /></Link>
        </div>
      )}
    </div>
  )
}
