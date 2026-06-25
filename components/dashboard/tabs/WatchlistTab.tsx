'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { tmdbImageUrl } from '@/lib/utils'
import { WatchlistIcon, FilmIcon, ArrowRightIcon } from '@/components/icons'

interface Item {
  tmdbId:    number
  title:     string
  posterPath: string | null
  status:    string
  addedAt:   string
}

const STATUS_TABS = [
  { value: 'want_to_watch', label: 'To Watch' },
  { value: 'watching',      label: 'Watching' },
  { value: 'watched',       label: 'History'  },
]

export default function WatchlistTab() {
  const [items,  setItems]  = useState<Item[]>([])
  const [status, setStatus] = useState('want_to_watch')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/watchlist?status=${status}`)
      .then(r => r.json())
      .then(data => setItems(data.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [status])

  return (
    <div>
      {/* Status tabs */}
      <div className="flex gap-2 mb-6">
        {STATUS_TABS.map(t => (
          <button
            key={t.value}
            onClick={() => setStatus(t.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-body transition-colors border
              ${status === t.value
                ? 'bg-ns-gold/10 border-ns-gold/40 text-ns-gold'
                : 'border-ns-border text-ns-muted hover:text-ns-text'}`}
          >
            {t.label}
          </button>
        ))}
        <div className="flex-1" />
        <Link href="/watchlist" className="text-xs font-body text-ns-muted hover:text-ns-gold transition-colors self-center flex items-center gap-0.5">
          Full page <ArrowRightIcon size={11} />
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="animate-pulse aspect-[2/3] bg-ns-border rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center">
          <WatchlistIcon size={40} className="text-ns-gold/40 mx-auto mb-3" />
          <p className="text-ns-muted font-body text-sm">Nothing here yet.</p>
          <Link href="/discover" className="text-ns-gold text-sm font-body hover:text-amber-400 transition-colors mt-2 inline-flex items-center gap-1">
            Discover films <ArrowRightIcon size={13} />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {items.map(item => (
            <Link key={item.tmdbId} href={`/movie/${item.tmdbId}`} className="group">
              <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-ns-border">
                {item.posterPath ? (
                  <Image
                    src={tmdbImageUrl(item.posterPath, 'w342')}
                    alt={item.title}
                    fill sizes="160px"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FilmIcon size={28} className="text-ns-muted/40" />
                  </div>
                )}
                {item.status === 'watching' && (
                  <div className="absolute bottom-1.5 left-1.5 bg-ns-gold/90 rounded px-1 py-0.5">
                    <span className="text-[8px] font-body font-bold text-ns-bg">NOW</span>
                  </div>
                )}
              </div>
              <p className="text-[11px] font-body text-ns-muted mt-1.5 line-clamp-1 group-hover:text-white transition-colors">
                {item.title}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
