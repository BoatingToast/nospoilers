'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { tmdbImageUrl } from '@/lib/utils'
import { FilmIcon, ArrowRightIcon } from '@/components/icons'
import PageHeader from '@/components/ui/PageHeader'
import Button from '@/components/ui/Button'

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
    <div className="space-y-8">
      {/* Status tabs */}
      <PageHeader title="Watchlist">
        {STATUS_TABS.map(t => (
          <Button
            key={t.value}
            variant={status === t.value ? 'secondary' : 'outline'}
            size="sm"
            aria-pressed={status === t.value}
            onClick={() => setStatus(t.value)}
            className="min-h-10"
          >
            {t.label}
          </Button>
        ))}
        <Link href="/watchlist" className="inline-flex items-center gap-1 font-heading text-sm text-ns-secondary-readable underline underline-offset-4 hover:text-ns-text">
          Full page <ArrowRightIcon size={11} />
        </Link>
      </PageHeader>

      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] animate-pulse rounded bg-ns-surface-2" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div>
          <p className="font-body text-sm text-ns-muted">Nothing here yet.</p>
          <Link href="/discover" className="mt-2 inline-flex items-center gap-1 font-heading text-sm text-ns-secondary-readable underline underline-offset-4 hover:text-ns-text">
            Discover films <ArrowRightIcon size={13} />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {items.map(item => (
            <Link key={item.tmdbId} href={`/movie/${item.tmdbId}`} className="group min-w-0">
              <div className="relative aspect-[2/3] overflow-hidden rounded border border-ns-border bg-ns-surface-2 transition-colors group-hover:border-ns-text/60">
                {item.posterPath ? (
                  <Image
                    src={tmdbImageUrl(item.posterPath, 'w342')}
                    alt={item.title}
                    fill sizes="160px"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FilmIcon size={28} className="text-ns-muted/40" />
                  </div>
                )}
                {item.status === 'watching' && (
                  <div className="absolute bottom-1.5 left-1.5 bg-ns-secondary/90 rounded-sm px-1 py-0.5">
                    <span className="text-[11px] font-body font-bold text-ns-bg">NOW</span>
                  </div>
                )}
              </div>
              <p className="mt-1.5 line-clamp-1 font-body text-[11px] text-ns-muted transition-colors group-hover:text-ns-text">
                {item.title}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
