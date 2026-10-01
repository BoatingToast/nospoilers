'use client'

import { useState, useEffect } from 'react'
import Link  from 'next/link'
import Image from 'next/image'
import PageHeader from '@/components/ui/PageHeader'
import Badge from '@/components/ui/Badge'
import type { Metadata } from 'next'

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

function ZoneSkeleton() {
  return (
    <div className="flex animate-pulse items-center gap-4 border-t border-ns-border py-4">
      <div className="h-[72px] w-12 flex-shrink-0 rounded bg-ns-surface" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-4 w-1/2 rounded bg-ns-border" />
        <div className="h-3 w-1/3 rounded bg-ns-border" />
      </div>
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
    <div className="min-h-screen bg-ns-bg">
      <div className="mx-auto w-full min-w-0 max-w-6xl px-4 py-12 sm:px-6">

        <PageHeader
          title="SPOILER ZONES"
          lede="The most active discussions happening right now. Spoilers welcome."
        />

        {loading ? (
          <div className="border-b border-ns-border [&>*:first-child]:border-t-0">
            {Array.from({ length: 12 }).map((_, i) => <ZoneSkeleton key={i} />)}
          </div>
        ) : zones.length === 0 ? (
          <p className="py-10 font-body text-base text-ns-muted">
            No active discussions yet. Join a movie&apos;s Spoiler Zone to get started!
          </p>
        ) : (
          <ul className="border-b border-ns-border [&>*:first-child>a]:border-t-0">
            {zones.map(zone => (
              <li key={zone.tmdbId}>
                <PopularCard zone={zone} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function PopularCard({ zone }: { zone: PopularZone }) {
  return (
    <Link
      href={`/movie/${zone.tmdbId}`}
      className="group flex min-w-0 items-center gap-4 border-t border-ns-border py-4 transition-colors hover:bg-ns-surface"
    >
      {/* Poster */}
      <div className="relative h-[72px] w-12 flex-shrink-0 overflow-hidden rounded border border-ns-border bg-ns-surface">
        {zone.moviePoster && (
          <Image
            src={`https://image.tmdb.org/t/p/w342${zone.moviePoster}`}
            alt={zone.movieTitle}
            fill
            className="object-cover"
            sizes="48px"
          />
        )}
      </div>

      {/* Body */}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="min-w-0 truncate font-heading text-base font-semibold text-ns-text">
            {zone.movieTitle}
          </h2>
          {zone.isActive && <Badge variant="secondary" className="flex-shrink-0">Active</Badge>}
        </div>
        <p className="mt-1 font-body text-xs text-ns-muted">
          <span>{fmt(zone.memberCount)} members</span>
          <span aria-hidden="true"> · </span>
          <span>{timeAgo(zone.lastActivity)}</span>
          {zone.weeklyMessages > 0 && (
            <>
              <span aria-hidden="true"> · </span>
              <span>{fmt(zone.weeklyMessages)} this week</span>
            </>
          )}
        </p>
      </div>

      <span className="hidden flex-shrink-0 font-heading text-sm text-ns-secondary-readable underline underline-offset-4 group-hover:text-ns-text sm:inline">
        Open Zone
      </span>
    </Link>
  )
}
