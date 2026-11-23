'use client'

import Image from 'next/image'
import { useState } from 'react'
import PosterRail from '@/components/discover/PosterRail'
import Modal from '@/components/ui/Modal'
import type { TMDbVideo } from '@/types'

interface Props {
  movieTitle: string
  trailers: TMDbVideo[]
}

function PlayMark({ size = 18 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5.5v13l10-6.5L8 5.5Z" />
    </svg>
  )
}

/** Rendered only in Standard mode. Its heading is the surrounding detail row. */
export default function MovieTrailers({ movieTitle, trailers }: Props) {
  const [selected, setSelected] = useState<TMDbVideo | null>(null)

  if (trailers.length === 0) return null

  return (
    <section aria-labelledby="movie-trailers-heading">
      <div className="animate-fade-up">
      <PosterRail
        label={`${movieTitle} trailers`}
        controlsLabel="trailers"
        bleed={false}
        heading={(
          <p className="text-sm text-ns-muted">
            Trailer footage can reveal plot details.{' '}
            <span className="tabular-nums">
              {trailers.length} {trailers.length === 1 ? 'video' : 'videos'}
            </span>
          </p>
        )}
      >
        {trailers.map(trailer => (
          <button
            key={trailer.id || trailer.key}
            type="button"
            onClick={() => setSelected(trailer)}
            aria-label={`Play ${trailer.name}`}
            className="group w-64 flex-shrink-0 snap-start rounded-xl text-left sm:w-72"
          >
            <span className="relative block aspect-video overflow-hidden rounded-xl bg-ns-surface-2">
              <Image
                src={`https://i.ytimg.com/vi/${trailer.key}/hqdefault.jpg`}
                alt=""
                fill
                sizes="(max-width: 640px) 256px, 288px"
                className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.04] motion-reduce:transform-none"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" />
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/70 pl-0.5 text-white transition-colors duration-150 group-hover:bg-ns-secondary group-hover:text-ns-secondary-foreground">
                  <PlayMark />
                </span>
              </span>
              <span className="absolute bottom-2 left-2 rounded-full bg-black/70 px-2.5 py-1 text-xs font-medium text-white">
                {trailer.official ? `Official ${trailer.type}` : trailer.type}
              </span>
            </span>
            <span className="mt-2.5 block truncate text-sm font-semibold text-ns-text transition-colors group-hover:text-ns-secondary-readable">
              {trailer.name}
            </span>
          </button>
        ))}
      </PosterRail>
      </div>

      {selected && (
        <Modal
          onClose={() => setSelected(null)}
          maxWidth="max-w-4xl"
          className="bg-black"
          ariaLabelledBy="movie-trailer-title"
        >
          <div>
            <div className="bg-ns-surface px-5 py-4 pr-14 sm:px-6">
              <p className="text-sm font-medium text-ns-secondary-readable">
                {selected.official ? `Official ${selected.type}` : selected.type}
              </p>
              <h2 id="movie-trailer-title" className="mt-1 truncate font-heading text-xl font-bold text-ns-text">
                {selected.name}
              </h2>
              <p className="mt-0.5 truncate text-sm text-ns-muted">{movieTitle}</p>
            </div>
            <div className="aspect-video bg-black">
              <iframe
                key={selected.key}
                src={`https://www.youtube-nocookie.com/embed/${selected.key}?autoplay=1&rel=0&playsinline=1`}
                title={`${movieTitle}: ${selected.name}`}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          </div>
        </Modal>
      )}
    </section>
  )
}
