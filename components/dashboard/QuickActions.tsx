import Link from 'next/link'
import { ArrowRightIcon } from '@/components/icons'

interface QuickActionsProps {
  ratingsCount: number
  watchlistCount: number
  friendCount: number
}

interface StatTile {
  href: string
  label: string
  description: string
  value: number
  unit: string
  tile: string
}

function buildTiles({ ratingsCount, watchlistCount, friendCount }: QuickActionsProps): StatTile[] {
  return [
    {
      href: '/ratings',
      label: 'Rate a movie',
      description: 'Make your Movie DNA more accurate',
      value: ratingsCount,
      unit: 'rated',
      tile: 'bg-ns-tile-peach',
    },
    {
      href: '/watchlist',
      label: 'Pick a movie',
      description: 'Open your list or let roulette decide',
      value: watchlistCount,
      unit: 'saved',
      tile: 'bg-ns-tile-blue',
    },
    {
      href: '/movie-night',
      label: 'Movie Night',
      description: 'Build a shortlist everyone will love',
      value: friendCount,
      unit: friendCount === 1 ? 'friend' : 'friends',
      tile: 'bg-ns-tile-green',
    },
  ]
}

export default function QuickActions(props: QuickActionsProps) {
  return (
    <section aria-label="Quick actions">
      <ul className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        {buildTiles(props).map((tile, index) => (
          <li key={tile.href} className="ns-reveal" style={{ '--i': index } as React.CSSProperties}>
            <Link
              href={tile.href}
              className={`group flex h-full flex-col justify-between gap-6 rounded-2xl p-6 ${tile.tile}`}
            >
              <span className="flex items-baseline gap-2">
                <span className="font-display text-5xl tabular-nums text-ns-text">{tile.value.toLocaleString()}</span>
                <span className="text-base text-ns-muted">{tile.unit}</span>
              </span>
              <span>
                <span className="flex items-center justify-between gap-3 font-heading text-lg font-bold text-ns-text">
                  {tile.label}
                  <ArrowRightIcon size={18} className="flex-shrink-0 transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-1 motion-reduce:transform-none" />
                </span>
                <span className="mt-1 block text-sm leading-relaxed text-ns-muted">{tile.description}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
