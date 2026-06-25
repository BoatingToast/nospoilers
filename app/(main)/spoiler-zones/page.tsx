'use client'

import { useState, useEffect } from 'react'
import Link  from 'next/link'
import Image from 'next/image'
import { SpoilerZoneIcon } from '@/components/icons'
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
    <div className="rounded-2xl border border-ns-border/50 bg-ns-surface/40 overflow-hidden animate-pulse">
      <div className="h-40 bg-ns-surface" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-ns-border rounded w-3/4" />
        <div className="h-3 bg-ns-border rounded w-1/2" />
        <div className="h-3 bg-ns-border rounded w-1/3" />
        <div className="h-8 bg-ns-border rounded-xl mt-2" />
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <SpoilerZoneIcon size={28} className="text-ns-gold" />
            <h1 className="font-display text-3xl tracking-widest text-ns-gold">SPOILER ZONES</h1>
          </div>
          <p className="text-ns-muted/60 font-body text-base ml-11">
            The most active discussions happening right now. Spoilers welcome.
          </p>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => <ZoneSkeleton key={i} />)}
          </div>
        ) : zones.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <SpoilerZoneIcon size={48} className="text-ns-muted/20 mb-4" />
            <p className="text-ns-muted/50 font-body">
              No active discussions yet. Join a movie&apos;s Spoiler Zone to get started!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {zones.map(zone => (
              <PopularCard key={zone.tmdbId} zone={zone} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function PopularCard({ zone }: { zone: PopularZone }) {
  return (
    <Link
      href={`/movie/${zone.tmdbId}`}
      className="group relative overflow-hidden rounded-2xl border border-ns-border/50
                 bg-ns-surface/40 hover:border-ns-gold/30 transition-all duration-300
                 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/30"
    >
      {/* Poster */}
      <div className="relative h-40 overflow-hidden">
        {zone.moviePoster ? (
          <>
            <Image
              src={`https://image.tmdb.org/t/p/w342${zone.moviePoster}`}
              alt={zone.movieTitle}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, 25vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ns-bg via-ns-bg/20 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 bg-ns-surface flex items-center justify-center">
            <SpoilerZoneIcon size={32} className="text-ns-muted/20" />
          </div>
        )}

        {/* Active badge */}
        {zone.isActive && (
          <div className="absolute top-2 left-2 flex items-center gap-1">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ns-gold opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-ns-gold" />
            </span>
            <span className="text-[9px] font-body text-ns-gold font-medium bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
              Active
            </span>
          </div>
        )}

        {/* Weekly messages badge */}
        {zone.weeklyMessages > 0 && (
          <div className="absolute top-2 right-2">
            <span className="text-[9px] font-body text-ns-muted/80 bg-black/50 backdrop-blur-sm
                             px-1.5 py-0.5 rounded-full">
              {fmt(zone.weeklyMessages)} this week
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-3">
        <h3 className="text-xs font-body font-semibold text-ns-text leading-tight mb-2 line-clamp-2">
          {zone.movieTitle}
        </h3>
        <div className="flex items-center gap-2 text-[10px] font-body text-ns-muted/60 mb-2">
          <span>{fmt(zone.memberCount)} members</span>
          <span className="text-ns-border">·</span>
          <span>{timeAgo(zone.lastActivity)}</span>
        </div>
        <div className="w-full text-center py-1.5 rounded-lg text-[11px] font-body font-semibold
                        bg-ns-gold/10 text-ns-gold border border-ns-gold/20
                        group-hover:bg-ns-gold group-hover:text-black group-hover:border-ns-gold
                        transition-all duration-200">
          Open Zone
        </div>
      </div>
    </Link>
  )
}
