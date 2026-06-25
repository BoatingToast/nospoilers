'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { tmdbImageUrl } from '@/lib/utils'
import { RatingsIcon, FilmIcon, ArrowRightIcon } from '@/components/icons'

interface Rating {
  tmdbId:    number
  title:     string
  posterPath: string | null
  score:     number
  createdAt: string
}

type Sort = 'date' | 'score_desc' | 'score_asc'

function scoreColor(s: number) {
  if (s >= 85) return 'text-ns-gold'
  if (s >= 70) return 'text-emerald-400'
  if (s >= 50) return 'text-blue-400'
  return 'text-ns-muted'
}

export default function RatingsTab() {
  const [ratings, setRatings] = useState<Rating[]>([])
  const [sort,    setSort]    = useState<Sort>('date')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const orderBy = sort === 'date' ? 'date' : 'score'
    fetch(`/api/ratings?sort=${orderBy}&limit=48`)
      .then(r => r.json())
      .then(data => {
        let items: Rating[] = data.items ?? []
        if (sort === 'score_asc') items = [...items].sort((a, b) => a.score - b.score)
        setRatings(items)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [sort])

  return (
    <div>
      {/* Sort + link */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-ns-muted text-xs font-body">Sort:</span>
        {([
          ['date',       'Recent'  ],
          ['score_desc', 'Highest' ],
          ['score_asc',  'Lowest'  ],
        ] as [Sort, string][]).map(([s, label]) => (
          <button
            key={s}
            onClick={() => setSort(s)}
            className={`px-3 py-1 rounded-full text-xs font-body transition-colors border
              ${sort === s
                ? 'bg-ns-gold/10 border-ns-gold/40 text-ns-gold'
                : 'border-ns-border text-ns-muted hover:text-ns-text'}`}
          >
            {label}
          </button>
        ))}
        <div className="flex-1" />
        <Link href="/ratings" className="text-xs font-body text-ns-muted hover:text-ns-gold transition-colors flex items-center gap-0.5">
          Full page <ArrowRightIcon size={11} className="inline-block" />
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="animate-pulse aspect-[2/3] bg-ns-border rounded-xl" />
          ))}
        </div>
      ) : ratings.length === 0 ? (
        <div className="py-16 text-center">
          <RatingsIcon size={40} className="text-ns-gold/40 mx-auto mb-3" />
          <p className="text-ns-muted font-body text-sm">No ratings yet.</p>
          <Link href="/discover" className="text-ns-gold text-sm font-body hover:text-amber-400 transition-colors mt-2 inline-flex items-center gap-1">
            Discover films to rate <ArrowRightIcon size={13} />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {ratings.map(r => (
            <Link key={r.tmdbId} href={`/movie/${r.tmdbId}`} className="group">
              <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-ns-border">
                {r.posterPath ? (
                  <Image
                    src={tmdbImageUrl(r.posterPath, 'w342')}
                    alt={r.title}
                    fill sizes="160px"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FilmIcon size={28} className="text-ns-muted/40" />
                  </div>
                )}
                <div className="absolute top-1.5 right-1.5 bg-black/70 rounded-full px-1.5 py-0.5">
                  <span className={`text-[10px] font-body font-bold ${scoreColor(r.score)}`}>{r.score}</span>
                </div>
              </div>
              <p className="text-[11px] font-body text-ns-muted mt-1.5 line-clamp-1 group-hover:text-white transition-colors">
                {r.title}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
