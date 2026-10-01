import Link from 'next/link'
import Section from '@/components/ui/Section'
import { ArrowRightIcon } from '@/components/icons'

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
}

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
    },
    {
      href: '/watchlist',
      label: 'Pick a movie',
      description: 'Open your list or let roulette decide',
      status: `${watchlistCount} saved`,
    },
    {
      href: '/ratings',
      label: 'Rate a movie',
      description: 'Make your Movie DNA more accurate',
      status: `${ratingsCount} rated`,
    },
    {
      href: '/movie-night',
      label: 'Movie Night',
      description: 'Build a shortlist everyone will love',
      status: friendCount === 1 ? '1 friend' : `${friendCount} friends`,
    },
  ]
}

function QuickActionRow({ href, label, description, status }: QuickAction) {
  return (
    <li className="border-t border-ns-border">
      <Link
        href={href}
        className="group grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-6 gap-y-1 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ns-secondary-readable sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_auto]"
      >
        <h3 className="font-heading text-base font-semibold text-ns-text transition-colors group-hover:text-ns-secondary-readable">
          {label}
        </h3>
        <p className="order-3 col-span-2 font-body text-sm leading-relaxed text-ns-muted sm:order-none sm:col-span-1">
          {description}
        </p>
        <p className="inline-flex items-center gap-2 whitespace-nowrap font-body text-sm tabular-nums text-ns-muted">
          {status}
          <ArrowRightIcon size={14} className="transition-colors group-hover:text-ns-secondary-readable" />
        </p>
      </Link>
    </li>
  )
}

export default function QuickActions(props: QuickActionsProps) {
  const actions = buildQuickActions(props)

  return (
    <Section headingId="quick-actions-title" title="Quick actions" note="What are you in the mood for?">
      <ul className="border-b border-ns-border">
        {actions.map(action => (
          <QuickActionRow key={action.href} {...action} />
        ))}
      </ul>
    </Section>
  )
}
