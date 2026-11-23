import Link from 'next/link'
import PosterImage from './PosterImage'

interface PosterTileProps {
  href: string
  title: string
  posterPath: string | null
  meta?: string
  rating?: number
  /** Short overlay on the poster, such as a match score. */
  badge?: string
  /** One extra line under the metadata, such as why it was picked. */
  note?: string
  ariaLabel?: string
  sizes?: string
}

/** Fluid poster for grids, where the fixed-width MovieCard cannot fit two columns on a phone. */
export default function PosterTile({
  href,
  title,
  posterPath,
  meta,
  rating,
  badge,
  note,
  ariaLabel,
  sizes = '(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 200px',
}: PosterTileProps) {
  return (
    <Link href={href} aria-label={ariaLabel ?? `View ${title}`} className="group block min-w-0 rounded-xl">
      <span className="relative block aspect-[2/3] overflow-hidden rounded-xl bg-ns-surface ring-1 ring-inset ring-white/5">
        <PosterImage path={posterPath} sizes={sizes} className="transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.04] motion-reduce:transform-none" />
        {badge && (
          <span className="absolute left-2 top-2 rounded-full bg-black/75 px-2 py-0.5 text-xs font-semibold tabular-nums text-white">
            {badge}
          </span>
        )}
      </span>
      <span className="mt-2.5 block truncate font-heading text-base font-semibold text-ns-text transition-colors duration-150 group-hover:text-ns-secondary-readable">
        {title}
      </span>
      {(meta || (rating !== undefined && rating > 0)) && (
        <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm tabular-nums text-ns-muted">
          {meta && <span className="truncate">{meta}</span>}
          {rating !== undefined && rating > 0 && (
            <>
              {meta && <span aria-hidden="true">·</span>}
              <span className="flex-shrink-0">{rating.toFixed(1)}</span>
            </>
          )}
        </span>
      )}
      {note && <span className="mt-1 line-clamp-2 block text-sm leading-snug text-ns-subtle">{note}</span>}
    </Link>
  )
}
