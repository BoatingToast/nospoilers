import Image from 'next/image'
import Link from 'next/link'
import { tmdbImageUrl, formatYear } from '@/lib/utils'
import FeedbackButtons from './FeedbackButtons'
import AddToCollectionButton from '@/components/collections/AddToCollectionButton'
import type { RecommendationItem } from '@/types'

export default function RecommendationCard({ rec }: { rec: RecommendationItem }) {
  const scoreColor =
    rec.matchScore >= 85 ? 'text-emerald-400' :
    rec.matchScore >= 70 ? 'text-ns-gold' :
                           'text-ns-muted'

  const isDismissed    = rec.feedback === 'dismissed' || rec.feedback === 'not_interested'

  if (isDismissed) return null

  return (
    <div className={`group flex flex-col gap-0 rounded-2xl bg-ns-surface border border-ns-border
                     transition-all duration-200 hover:border-ns-gold/30
                     hover:shadow-[0_0_20px_rgba(200,150,62,0.08)] overflow-hidden`}>
      <Link href={`/movie/${rec.tmdbId}`} className="flex gap-4 p-4">
        {/* Poster */}
        <div className="relative w-[80px] h-[120px] rounded-lg overflow-hidden flex-shrink-0 bg-ns-border">
          <Image
            src={tmdbImageUrl(rec.posterPath, 'w185')}
            alt={rec.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="80px"
          />
        </div>

        {/* Info */}
        <div className="flex flex-col gap-1.5 justify-center min-w-0">
          <div className={`flex items-center gap-1.5 text-xs font-body font-semibold ${scoreColor}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${
              rec.matchScore >= 85 ? 'bg-emerald-400' :
              rec.matchScore >= 70 ? 'bg-ns-gold' : 'bg-ns-muted'
            }`} />
            {rec.matchScore}% Match
          </div>

          <h3 className="text-ns-text font-body font-semibold text-sm leading-tight line-clamp-2
                         group-hover:text-ns-gold transition-colors">
            {rec.title}
          </h3>

          {rec.releaseDate && (
            <p className="text-ns-muted text-xs font-body">{formatYear(rec.releaseDate)}</p>
          )}

          <p className="text-ns-muted text-xs font-body leading-relaxed line-clamp-2 mt-0.5">
            {rec.explanation}
          </p>
        </div>
      </Link>

      {/* Actions row */}
      <div className="px-4 pb-3 border-t border-ns-border/50 pt-2.5 flex items-center justify-between gap-2">
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
    </div>
  )
}
