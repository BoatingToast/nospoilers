'use client'

import Image from 'next/image'
import { useState } from 'react'
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

export default function MovieTrailers({ movieTitle, trailers }: Props) {
  const [selected, setSelected] = useState<TMDbVideo | null>(null)

  if (trailers.length === 0) return null

  return (
    <section aria-labelledby="movie-trailers-heading" className="mb-10">
      <div className="mb-4 flex items-center justify-between gap-4">
        <p id="movie-trailers-heading" className="text-xs font-body uppercase tracking-widest text-ns-muted">
          Trailers
        </p>
        <p className="text-[10px] font-body text-ns-muted/60">
          {trailers.length} {trailers.length === 1 ? 'video' : 'videos'}
        </p>
      </div>

      <div className="-mx-6 flex gap-4 overflow-x-auto px-6 pb-2 scrollbar-hide">
        {trailers.map(trailer => (
          <button
            key={trailer.id || trailer.key}
            type="button"
            onClick={() => setSelected(trailer)}
            aria-label={`Play ${trailer.name}`}
            className="group w-[260px] flex-shrink-0 rounded-xl text-left focus-visible:outline-none
                       focus-visible:ring-2 focus-visible:ring-ns-secondary focus-visible:ring-offset-4
                       focus-visible:ring-offset-ns-bg sm:w-[300px]"
          >
            <span className="relative block aspect-video overflow-hidden rounded-xl border border-ns-border bg-ns-surface
                             transition-all duration-300 group-hover:-translate-y-0.5 group-hover:border-ns-secondary/60
                             group-hover:shadow-xl group-hover:shadow-black/30">
              <Image
                src={`https://i.ytimg.com/vi/${trailer.key}/hqdefault.jpg`}
                alt=""
                fill
                sizes="(max-width: 640px) 260px, 300px"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" />
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/25 bg-black/65 pl-0.5 text-white shadow-xl backdrop-blur-sm transition-all duration-200 group-hover:scale-110 group-hover:bg-ns-secondary">
                  <PlayMark />
                </span>
              </span>
              <span className="absolute bottom-2 left-2 rounded-md border border-white/10 bg-black/65 px-2 py-1 text-[9px] font-body uppercase tracking-wider text-white/85 backdrop-blur-sm">
                {trailer.official ? `Official ${trailer.type}` : trailer.type}
              </span>
            </span>
            <span className="mt-2 block truncate text-sm font-body font-medium text-ns-text transition-colors group-hover:text-ns-secondary">
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
              <p className="text-[10px] font-body uppercase tracking-[0.2em] text-ns-secondary">
                {selected.official ? `Official ${selected.type}` : selected.type}
              </p>
              <h2 id="movie-trailer-title" className="mt-1 truncate font-heading text-lg font-semibold text-ns-text sm:text-xl">
                {selected.name}
              </h2>
              <p className="mt-0.5 truncate text-xs font-body text-ns-muted">{movieTitle}</p>
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
