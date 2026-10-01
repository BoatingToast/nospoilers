import Link  from 'next/link'
import Image from 'next/image'
import Section from '@/components/ui/Section'
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
    <Section
      className="mt-14"
      title="Spoiler Zones"
      action={<span className="text-sm font-body text-ns-muted">{memberships.length}</span>}
    >
      <ul className="grid min-w-0 grid-cols-1 sm:grid-cols-2 sm:gap-x-10">
        {memberships.map(m => {
          const memberCount = countMap.get(m.tmdbId) ?? 0
          return (
            <li key={m.id} className="min-w-0 border-t border-ns-border">
              <Link
                href={`/movie/${m.tmdbId}`}
                className="group flex min-h-[56px] items-center gap-3 py-2"
              >
                <div className="relative h-12 w-8 flex-shrink-0 overflow-hidden rounded-sm bg-ns-border">
                  {m.moviePoster && (
                    <Image
                      src={`https://image.tmdb.org/t/p/w200${m.moviePoster}`}
                      alt=""
                      fill
                      sizes="32px"
                      className="object-cover"
                    />
                  )}
                </div>
                <p className="min-w-0 flex-1 text-sm font-body font-semibold leading-tight text-ns-text line-clamp-2 group-hover:underline underline-offset-4">
                  {m.movieTitle}
                </p>
                <p className="flex-shrink-0 text-xs font-body text-ns-muted">
                  {memberCount.toLocaleString()} member{memberCount !== 1 ? 's' : ''}
                </p>
              </Link>
            </li>
          )
        })}
      </ul>
    </Section>
  )
}
