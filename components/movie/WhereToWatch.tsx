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
      <Button onClick={() => setOpen(true)} aria-expanded={open} aria-haspopup="dialog">
        <WhereToWatchIcon size={16} />
        Where to watch
        <span className="rounded-full bg-black/15 px-1.5 py-0.5 text-xs leading-none tabular-nums">
          {availableProviders.length}
        </span>
      </Button>

      {open && (
        <Modal
          onClose={() => setOpen(false)}
          ariaLabelledBy="where-to-watch-title"
          ariaDescribedBy="where-to-watch-region"
          maxWidth="max-w-lg"
        >
          <div>
            <div className="px-6 pb-4 pr-16 pt-6">
              <p className="text-sm font-medium text-ns-muted">Where to watch</p>
              <h2 id="where-to-watch-title" className="mt-1 break-words font-display text-3xl text-ns-text">
                {movieTitle}
              </h2>
              <p id="where-to-watch-region" className="mt-1.5 text-sm text-ns-muted">
                Available in {regionName}
              </p>
            </div>

            <ul className="max-h-[55vh] divide-y divide-ns-border overflow-y-auto px-3">
              {availableProviders.map(provider => (
                <li key={`${provider.name}-${provider.url}`}>
                  <a
                    href={provider.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex min-h-16 min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-150 hover:bg-ns-surface-2"
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
                      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-ns-surface-3 font-heading text-sm font-bold text-ns-text">
                        {provider.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base font-semibold text-ns-text">
                        {provider.name}
                      </span>
                      <span className="block truncate text-sm text-ns-muted">
                        {provider.source === 'tmdb' && provider.accessTypes?.length
                          ? provider.accessTypes.map(type => ACCESS_LABELS[type]).join(' · ')
                          : 'Open direct watch link'}
                      </span>
                    </span>
                    <ArrowRightIcon size={16} className="flex-shrink-0 text-ns-muted transition-[transform,color] duration-150 group-hover:translate-x-0.5 group-hover:text-ns-text motion-reduce:transform-none" />
                  </a>
                </li>
              ))}
            </ul>

            <div className="px-6 pb-6 pt-4 text-xs leading-relaxed text-ns-muted">
              <p>Availability can change and may vary by region.</p>
              {hasAutomaticProviders && (
                <p className="mt-1">
                  Automatic availability data powered by{' '}
                  <a
                    href="https://www.justwatch.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ns-text underline decoration-ns-border-strong underline-offset-2 hover:decoration-ns-text"
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
