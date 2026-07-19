import Link from 'next/link'
import type { ComponentType } from 'react'
import {
  ArrowRightIcon,
  ClapperboardIcon,
  RatingsIcon,
  RecsIcon,
  WatchlistIcon,
  type IconProps,
} from '@/components/icons'

interface QuickActionsProps {
  ratingsCount: number
  watchlistCount: number
  friendCount: number
}

interface QuickAction {
  href: string
  label: string
  description: string
  status: string
  Icon: ComponentType<IconProps>
}



// CHUNK 1 — QUICK ACTION SETUP AND PERSONALIZED COUNTS






function buildQuickActions({
  ratingsCount,
  watchlistCount,
  friendCount,
}: QuickActionsProps): QuickAction[] {
  return [
    {
      href: '/discover',
      label: 'Discover',
      description: 'Find your next spoiler-free favorite',
      status: 'Explore movies',
      Icon: RecsIcon,
    },
    {
      href: '/watchlist',
      label: 'Pick a movie',
      description: 'Open your list or let roulette decide',
      status: `${watchlistCount} saved`,
      Icon: WatchlistIcon,
    },
    {
      href: '/ratings',
      label: 'Rate a movie',
      description: 'Make your Movie DNA more accurate',
      status: `${ratingsCount} rated`,
      Icon: RatingsIcon,
    },
    {
      href: '/movie-night',
      label: 'Movie Night',
      description: 'Build a shortlist everyone will love',
      status: friendCount === 1 ? '1 friend' : `${friendCount} friends`,
      Icon: ClapperboardIcon,
    },
  ]
}










function QuickActionCard({ href, label, description, status, Icon }: QuickAction) {
  return (
    <Link
      href={href}
      className="group relative min-h-40 overflow-hidden rounded-2xl border border-ns-border bg-ns-surface p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-ns-secondary/45 hover:bg-ns-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ns-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-ns-bg sm:min-h-36"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-ns-secondary/20 bg-ns-secondary/10 text-ns-secondary transition-colors group-hover:border-ns-secondary/35 group-hover:bg-ns-secondary/15">
          <Icon size={17} />
        </span>
        <ArrowRightIcon
          size={15}
          className="mt-1 text-ns-muted/50 transition-all group-hover:translate-x-0.5 group-hover:text-ns-secondary"
        />
      </div>

      <div className="mt-4">
        <h3 className="font-heading text-sm font-semibold text-ns-text transition-colors group-hover:text-white">
          {label}
        </h3>
        <p className="mt-1 text-[11px] leading-relaxed font-body text-ns-muted">
          {description}
        </p>
      </div>

      <p className="mt-3 text-[10px] font-body uppercase tracking-wider text-ns-muted/65">
        {status}
      </p>
    </Link>
  )
}







export default function QuickActions(props: QuickActionsProps) {
  const actions = buildQuickActions(props)

  return (
    <section aria-labelledby="quick-actions-title">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-body uppercase tracking-[0.2em] text-ns-secondary">
            Jump back in
          </p>
          <h2 id="quick-actions-title" className="mt-1 font-heading text-base font-semibold text-ns-text">
            Quick actions
          </h2>
        </div>
        <p className="hidden text-xs font-body text-ns-muted sm:block">What are you in the mood for?</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {actions.map(action => (
          <QuickActionCard key={action.href} {...action} />
        ))}
      </div>
    </section>
  )
}
