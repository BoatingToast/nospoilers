import Link from 'next/link'
import { formatYear } from '@/lib/utils'
import FeedbackButtons from './FeedbackButtons'
import AddToCollectionButton from '@/components/collections/AddToCollectionButton'
import PosterImage from '@/components/discover/PosterImage'
import GrowBar from '@/components/movie/GrowBar'
import type { RecommendationItem } from '@/types'

export default function RecommendationCard({ rec }: { rec: RecommendationItem }) {
  const isDismissed    = rec.feedback === 'dismissed' || rec.feedback === 'not_interested'

  if (isDismissed) return null

  return (
    <article className="group flex min-w-0 flex-col rounded-2xl bg-ns-surface">
      <Link href={`/movie/${rec.tmdbId}`} className="flex min-w-0 gap-4 rounded-2xl p-4">
        <span className="relative block aspect-[2/3] w-20 flex-shrink-0 self-start overflow-hidden rounded-lg bg-ns-surface-2">
          <PosterImage
            path={rec.posterPath}
            size="w185"
            sizes="80px"
            className="transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transform-none"
          />
        </span>

        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="line-clamp-2 font-heading text-base font-semibold leading-tight text-ns-text transition-colors duration-150 group-hover:text-ns-secondary-readable">
            {rec.title}
          </span>
          {rec.releaseDate && (
            <span className="text-sm tabular-nums text-ns-muted">{formatYear(rec.releaseDate)}</span>
          )}
          <span className="mt-0.5 flex items-center gap-2">
            <GrowBar value={rec.matchScore / 100} className="flex-1" />
            <span className="flex-shrink-0 text-sm font-semibold tabular-nums text-ns-text">{rec.matchScore}% match</span>
          </span>
          <span className="mt-0.5 line-clamp-2 text-sm leading-snug text-ns-muted">{rec.explanation}</span>
        </span>
      </Link>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-ns-border px-4 py-2">
        <FeedbackButtons recommendationId={rec.id} initialFeedback={rec.feedback} />
        <AddToCollectionButton
          movie={{
            tmdbId:      rec.tmdbId,
            title:       rec.title,
            posterPath:  rec.posterPath,
            releaseDate: rec.releaseDate,
          }}
        />
      </div>
    </article>
  )
}
