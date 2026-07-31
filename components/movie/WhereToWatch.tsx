'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Modal from '@/components/ui/Modal'
import { ArrowRightIcon, WhereToWatchIcon } from '@/components/icons'
import type { MovieWatchProvider } from '@/lib/movie-uploads'
import { tmdbImageUrl } from '@/lib/utils'

interface Props {
  movieTitle: string
  providers: MovieWatchProvider[]
  region?: string | null
}

const REGION_NAMES: Record<string, string> = {
  US: 'United States',
  CA: 'Canada',
  GB: 'United Kingdom',
  AU: 'Australia',
}

function uniqueProviders(items: MovieWatchProvider[]) {
  const providers = new Map<string, MovieWatchProvider>()

  for (const item of items) {
    const key = item.name.toLowerCase()
    if (!providers.has(key)) providers.set(key, item)
  }

  return [...providers.values()]
}

const ACCESS_LABELS = {
  stream: 'Stream',
  free: 'Free',
  ads: 'Free with ads',
  rent: 'Rent',
  buy: 'Buy',
} as const

export default function WhereToWatch({ movieTitle, providers, region = 'US' }: Props) {
  const [open, setOpen] = useState(false)
  const availableProviders = useMemo(() => uniqueProviders(providers), [providers])

  if (availableProviders.length === 0) return null

  const regionCode = region?.toUpperCase() ?? 'US'
  const regionName = REGION_NAMES[regionCode] ?? regionCode
  const hasAutomaticProviders = availableProviders.some(provider => provider.source === 'tmdb')

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="inline-flex items-center gap-2 rounded-xl bg-ns-secondary px-4 py-2.5
                   text-sm font-body font-semibold text-ns-secondary-foreground shadow-lg
                   shadow-ns-secondary/10 transition-all duration-200 hover:bg-ns-secondary/90
                   hover:shadow-ns-secondary/20 active:scale-[0.98]"
      >
        <WhereToWatchIcon size={16} />
        Where to Watch
        <span className="rounded-full bg-black/15 px-1.5 py-0.5 text-[10px] leading-none">
          {availableProviders.length}
        </span>
      </button>

      {open && (
        <Modal onClose={() => setOpen(false)} maxWidth="max-w-lg">
          <div role="dialog" aria-modal="true" aria-labelledby="where-to-watch-title">
            <div className="border-b border-ns-border bg-gradient-to-r from-ns-secondary/10 to-transparent px-5 py-5 pr-14 sm:px-6 sm:py-6">
              <div className="mb-2 flex items-center gap-2 text-ns-secondary">
                <WhereToWatchIcon size={18} />
                <span className="text-[10px] font-body uppercase tracking-[0.2em]">Where to watch</span>
              </div>
              <h2 id="where-to-watch-title" className="font-display text-2xl tracking-wider text-ns-text sm:text-3xl">
                {movieTitle.toUpperCase()}
              </h2>
              <p className="mt-1 text-xs font-body text-ns-muted">
                Available in {regionName}
              </p>
            </div>

            <div className="max-h-[55vh] overflow-y-auto px-5 py-5 sm:px-6">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {availableProviders.map(provider => (
                  <a
                    key={`${provider.name}-${provider.url}`}
                    href={provider.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex min-w-0 items-center gap-3 rounded-xl border border-ns-border
                               bg-ns-surface p-3 transition-colors hover:border-ns-secondary/40"
                  >
                    {provider.logoPath ? (
                      <Image
                        src={tmdbImageUrl(provider.logoPath, 'w185')}
                        alt=""
                        width={40}
                        height={40}
                        className="h-10 w-10 flex-shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-ns-secondary/10 font-display text-sm text-ns-secondary">
                        {provider.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-body font-semibold text-ns-text">
                        {provider.name}
                      </span>
                      <span className="block truncate text-[10px] font-body text-ns-muted">
                        {provider.source === 'tmdb' && provider.accessTypes?.length
                          ? provider.accessTypes.map(type => ACCESS_LABELS[type]).join(' · ')
                          : 'Open direct watch link'}
                      </span>
                    </span>
                    <ArrowRightIcon size={14} className="flex-shrink-0 text-ns-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ns-secondary" />
                  </a>
                ))}
              </div>
            </div>

            <div className="border-t border-ns-border bg-ns-surface/40 px-5 py-3 text-center text-[10px] font-body leading-relaxed text-ns-muted/70 sm:px-6">
              <p>Availability can change and may vary by region.</p>
              {hasAutomaticProviders && (
                <p className="mt-1">
                  Automatic availability data powered by{' '}
                  <a
                    href="https://www.justwatch.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ns-muted underline decoration-ns-border underline-offset-2 hover:text-ns-text"
                  >
                    JustWatch
                  </a>
                  . Provider cards open TMDB&apos;s watch page.
                </p>
              )}
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
