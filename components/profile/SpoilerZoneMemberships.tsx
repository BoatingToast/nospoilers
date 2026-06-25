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
    <div className="bg-ns-surface border border-ns-border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <SpoilerZoneIcon size={14} className="text-ns-gold/70" />
        <p className="text-ns-muted text-[10px] tracking-widest uppercase font-body">Spoiler Zones</p>
        <span className="ml-auto text-[10px] font-body text-ns-muted/50">{memberships.length}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {memberships.map(m => {
          const memberCount = countMap.get(m.tmdbId) ?? 0
          return (
            <Link
              key={m.id}
              href={`/movie/${m.tmdbId}`}
              className="group relative overflow-hidden rounded-xl border border-ns-border
                         hover:border-ns-gold/30 transition-all duration-200 hover:scale-[1.02]"
            >
              {/* Poster background */}
              {m.moviePoster ? (
                <div className="absolute inset-0">
                  <Image
                    src={`https://image.tmdb.org/t/p/w200${m.moviePoster}`}
                    alt=""
                    fill
                    className="object-cover opacity-15 group-hover:opacity-25 transition-opacity"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ns-bg via-ns-bg/80 to-ns-bg/50" />
                </div>
              ) : (
                <div className="absolute inset-0 bg-ns-bg/50" />
              )}

              <div className="relative p-3 min-h-[72px] flex flex-col justify-between">
                <p className="text-[11px] font-body font-semibold text-ns-text leading-tight line-clamp-2">
                  {m.movieTitle}
                </p>
                <p className="text-[9px] font-body text-ns-muted/50 mt-1">
                  {memberCount.toLocaleString()} member{memberCount !== 1 ? 's' : ''}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
