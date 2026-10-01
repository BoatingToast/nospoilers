import Image from 'next/image'
import Link from 'next/link'
import { tmdbImageUrl, formatYear } from '@/lib/utils'
import FeedbackButtons from './FeedbackButtons'
import Card from '@/components/ui/Card'
import AddToCollectionButton from '@/components/collections/AddToCollectionButton'
import type { RecommendationItem } from '@/types'

export default function RecommendationCard({ rec }: { rec: RecommendationItem }) {
  const scoreColor =
    rec.matchScore >= 85 ? 'text-ns-success' :
    rec.matchScore >= 70 ? 'text-ns-secondary-readable' :
                           'text-ns-muted'

  const isDismissed    = rec.feedback === 'dismissed' || rec.feedback === 'not_interested'

  if (isDismissed) return null

  return (
    <Card interactive className="group flex min-w-0 flex-col overflow-hidden">
      <Link href={`/movie/${rec.tmdbId}`} className="flex gap-4 p-4">
        {/* Poster */}
        <div className="relative h-[120px] w-[80px] flex-shrink-0 overflow-hidden rounded bg-ns-surface-2">
          <Image
            src={tmdbImageUrl(rec.posterPath, 'w185')}
            alt={rec.title}
            fill
            className="object-cover"
            sizes="80px"
          />
        </div>

        {/* Info */}
        <div className="flex min-w-0 flex-col justify-center gap-1.5">
          <h3 className="font-body text-sm font-semibold leading-tight text-ns-text line-clamp-2 transition-colors group-hover:text-ns-secondary-readable">
            {rec.title}
          </h3>

          <p className="font-body text-xs text-ns-muted">
            <span className={`font-semibold ${scoreColor}`}>{rec.matchScore}% Match</span>
            {rec.releaseDate && <> · {formatYear(rec.releaseDate)}</>}
          </p>

          <p className="mt-0.5 font-body text-xs leading-relaxed text-ns-muted line-clamp-2">
            {rec.explanation}
          </p>
        </div>
      </Link>

      {/* Actions row */}
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-ns-border px-4 py-2">
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
    </Card>
  )
}
