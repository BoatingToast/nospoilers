'use client'

import { useState, useEffect } from 'react'
import Link  from 'next/link'
import Image from 'next/image'
import EmptyState from '@/components/ui/EmptyState'
import PageHeader from '@/components/ui/PageHeader'
import { SpoilerZoneIcon } from '@/components/icons'

interface PopularZone {
  tmdbId:         number
  movieTitle:     string
  moviePoster:    string | null
  memberCount:    number
  weeklyMessages: number
  lastActivity:   string | null
  isActive:       boolean
}

function timeAgo(iso: string | null): string {
  if (!iso) return '–'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function fmt(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toLocaleString()
}

const GRID = 'grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'

function ZoneSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[2/3] rounded-xl bg-ns-surface" />
      <div className="mt-3 h-4 w-3/4 rounded-sm bg-ns-surface" />
      <div className="mt-2 h-3.5 w-1/2 rounded-sm bg-ns-surface" />
    </div>
  )
}

export default function PopularSpoilerZonesPage() {
  const [zones,   setZones]   = useState<PopularZone[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/spoiler-zones/popular?limit=24')
      .then(r => r.ok ? r.json() : [])
      .then((d: PopularZone[]) => setZones(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-16">
      <PageHeader
        title="Spoiler Zones"
        description="The most active discussions happening right now. Spoilers welcome."
      />

      <div className="mt-8 lg:mt-10">
        {loading ? (
          <div className={GRID}>
            {Array.from({ length: 12 }).map((_, i) => <ZoneSkeleton key={i} />)}
          </div>
        ) : zones.length === 0 ? (
          <EmptyState title="No active discussions yet." description="Join a movie's Spoiler Zone to get started!" />
        ) : (
          <div className={GRID}>
            {zones.map((zone, index) => (
              <PopularCard key={zone.tmdbId} zone={zone} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function PopularCard({ zone, index }: { zone: PopularZone; index: number }) {
  return (
    <Link
      href={`/movie/${zone.tmdbId}`}
      className="ns-reveal group block min-w-0 rounded-xl"
      style={{ '--i': Math.min(index, 7) } as React.CSSProperties}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-ns-surface">
        {zone.moviePoster ? (
          <>
            <Image
              src={`https://image.tmdb.org/t/p/w342${zone.moviePoster}`}
              alt=""
              fill
              className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.04] motion-reduce:transform-none"
              sizes="(min-width: 1280px) 16vw, (min-width: 1024px) 24vw, (min-width: 640px) 32vw, 46vw"
            />
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent" />
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <SpoilerZoneIcon size={32} className="text-ns-muted" />
          </div>
        )}

        {zone.isActive && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-full bg-black/75 px-2.5 py-1 text-xs font-semibold text-white">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ns-accent" />
            Active
          </span>
        )}

        {zone.weeklyMessages > 0 && (
          <span className="absolute bottom-2 left-2 text-xs font-semibold tabular-nums text-white">
            {fmt(zone.weeklyMessages)} this week
          </span>
        )}
      </div>

      <h2 className="mt-3 line-clamp-2 font-heading text-base font-semibold leading-snug text-ns-text transition-colors duration-150 group-hover:text-ns-secondary-readable">
        {zone.movieTitle}
      </h2>
      <p className="mt-1 text-sm tabular-nums text-ns-muted">
        {fmt(zone.memberCount)} members · {timeAgo(zone.lastActivity)}
      </p>
    </Link>
  )
}
