'use client'

import Image from 'next/image'
import { useState } from 'react'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Section from '@/components/ui/Section'
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

export default function MovieTrailers({ movieTitle, trailers }: Props) {
  const [selected, setSelected] = useState<TMDbVideo | null>(null)

  if (trailers.length === 0) return null

  return (
    <Section
      headingId="movie-trailers-heading"
      title="Trailers"
      note="Trailer footage can reveal plot details."
      action={
        <p className="font-body text-xs text-ns-muted">
          {trailers.length} {trailers.length === 1 ? 'video' : 'videos'}
        </p>
      }
    >
      <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 scrollbar-hide sm:-mx-6 sm:px-6">
        {trailers.map(trailer => (
          <button
            key={trailer.id || trailer.key}
            type="button"
            onClick={() => setSelected(trailer)}
            aria-label={`Play ${trailer.name}`}
            className="group w-[260px] flex-shrink-0 rounded text-left focus-visible:outline-none
                       focus-visible:ring-2 focus-visible:ring-ns-secondary focus-visible:ring-offset-4
                       focus-visible:ring-offset-ns-bg sm:w-[300px]"
          >
            <span className="relative block aspect-video overflow-hidden rounded border border-ns-border bg-ns-surface
                             transition-colors duration-200 group-hover:border-ns-text/60">
              <Image
                src={`https://i.ytimg.com/vi/${trailer.key}/hqdefault.jpg`}
                alt=""
                fill
                sizes="(max-width: 640px) 260px, 300px"
                className="object-cover"
              />
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-12 w-12 items-center justify-center rounded bg-ns-bg/85 text-ns-text transition-colors duration-200 group-hover:bg-ns-secondary group-hover:text-ns-secondary-foreground">
                  <PlayMark />
                </span>
              </span>
              <Badge variant="outline" className="absolute bottom-2 left-2 bg-ns-bg/90">
                {trailer.official ? `Official ${trailer.type}` : trailer.type}
              </Badge>
            </span>
            <span className="mt-2 block truncate font-heading text-sm font-semibold text-ns-text transition-colors group-hover:text-ns-secondary-readable">
              {trailer.name}
            </span>
          </button>
        ))}
      </div>

      {selected && (
        <Modal
          onClose={() => setSelected(null)}
          maxWidth="max-w-4xl"
          className="bg-black"
          ariaLabelledBy="movie-trailer-title"
        >
          <div>
            <div className="border-b border-white/10 bg-ns-bg px-5 py-4 pr-14 sm:px-6">
              <h2 id="movie-trailer-title" className="truncate font-heading text-lg font-semibold text-ns-text sm:text-xl">
                {selected.name}
              </h2>
              <p className="mt-0.5 truncate text-xs font-body text-ns-muted">
                {movieTitle} · {selected.official ? `Official ${selected.type}` : selected.type}
              </p>
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
    </Section>
  )
}
