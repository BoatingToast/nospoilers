'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Button from '@/components/ui/Button'
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
      <Button
        variant="primary"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="min-h-10"
      >
        <WhereToWatchIcon size={16} />
        Where to Watch
        <span className="text-xs font-normal">({availableProviders.length})</span>
      </Button>

      {open && (
        <Modal
          onClose={() => setOpen(false)}
          ariaLabelledBy="where-to-watch-title"
          ariaDescribedBy="where-to-watch-region"
          maxWidth="max-w-lg"
        >
          <div>
            <div className="border-b border-ns-border px-5 py-5 pr-14 sm:px-6 sm:py-6">
              <h2 id="where-to-watch-title" className="font-display text-2xl tracking-wide text-ns-text sm:text-3xl">
                {movieTitle.toUpperCase()}
              </h2>
              <p id="where-to-watch-region" className="mt-1 text-sm font-body text-ns-muted">
                Where to watch. Available in {regionName}
              </p>
            </div>

            <div className="max-h-[55vh] overflow-y-auto px-5 pb-2 sm:px-6">
              {availableProviders.map(provider => (
                <a
                  key={`${provider.name}-${provider.url}`}
                  href={provider.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex min-h-16 min-w-0 items-center gap-3 border-t border-ns-border py-3 first:border-t-0"
                >
                  {provider.logoPath ? (
                    <Image
                      src={tmdbImageUrl(provider.logoPath, 'w185')}
                      alt=""
                      width={40}
                      height={40}
                      className="h-10 w-10 flex-shrink-0 rounded object-cover"
                    />
                  ) : (
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded border border-ns-border font-display text-sm text-ns-secondary-readable">
                      {provider.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-heading font-semibold text-ns-text transition-colors group-hover:text-ns-secondary-readable">
                      {provider.name}
                    </span>
                    <span className="block truncate text-xs font-body text-ns-muted">
                      {provider.source === 'tmdb' && provider.accessTypes?.length
                        ? provider.accessTypes.map(type => ACCESS_LABELS[type]).join(' · ')
                        : 'Open direct watch link'}
                    </span>
                  </span>
                  <ArrowRightIcon size={14} className="flex-shrink-0 text-ns-muted group-hover:text-ns-secondary-readable" />
                </a>
              ))}
            </div>

            <div className="border-t border-ns-border px-5 py-3 text-xs font-body leading-relaxed text-ns-muted sm:px-6">
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
