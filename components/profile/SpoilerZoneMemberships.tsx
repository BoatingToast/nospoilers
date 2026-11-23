import Link  from 'next/link'
import Image from 'next/image'
import { SpoilerZoneIcon } from '@/components/icons'
import { prisma } from '@/lib/db'

interface Props {
  userId: string
}

export default async function SpoilerZoneMemberships({ userId }: Props) {
  // Fetch memberships + member count per movie
  const memberships = await prisma.spoilerZoneMembership.findMany({
    where:   { userId },
    orderBy: { createdAt: 'desc' },
    take:    8,
  })

  if (memberships.length === 0) return null

  // Batch member counts
  const tmdbIds = memberships.map(m => m.tmdbId)
  const memberCounts = await prisma.spoilerZoneMembership.groupBy({
    by:     ['tmdbId'],
    where:  { tmdbId: { in: tmdbIds } },
    _count: { id: true },
  })
  const countMap = new Map(memberCounts.map(r => [r.tmdbId, r._count.id]))

  return (
    <div>
      <h3 className="ns-reveal font-heading text-xl font-bold text-ns-text">
        Spoiler Zones <span className="ml-1 font-body text-base font-medium tabular-nums text-ns-muted">{memberships.length}</span>
      </h3>

      <div className="mt-4 grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 lg:grid-cols-8">
        {memberships.map((m, index) => {
          const memberCount = countMap.get(m.tmdbId) ?? 0
          return (
            <Link
              key={m.id}
              href={`/movie/${m.tmdbId}`}
              className="ns-reveal group block min-w-0 rounded-xl"
              style={{ '--i': Math.min(index, 7) } as React.CSSProperties}
            >
              <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-ns-surface">
                {m.moviePoster ? (
                  <Image
                    src={`https://image.tmdb.org/t/p/w342${m.moviePoster}`}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 150px, (min-width: 640px) 24vw, 30vw"
                    className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.04] motion-reduce:transform-none"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <SpoilerZoneIcon size={24} className="text-ns-muted" />
                  </div>
                )}
              </div>
              <p className="mt-2 truncate text-sm font-semibold text-ns-text transition-colors duration-150 group-hover:text-ns-secondary-readable">
                {m.movieTitle}
              </p>
              <p className="truncate text-xs tabular-nums text-ns-muted">
                {memberCount.toLocaleString()} member{memberCount !== 1 ? 's' : ''}
              </p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
