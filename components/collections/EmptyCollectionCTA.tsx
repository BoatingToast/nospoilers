'use client'

import dynamic from 'next/dynamic'
import { FilmIcon } from '@/components/icons'

const CollectionPickerModal = dynamic(() => import('./CollectionPickerModal'), { ssr: false })

// This renders on the collection detail page when movieCount === 0 and the
// viewer is the owner. Clicking opens the picker modal pre-targeted at THIS
// collection — but since the modal shows all collections, the user can just
// search for movies on the Search or Discover page and use the button there.
// The CTA here links to Search so the owner has an obvious next step.

export default function EmptyCollectionCTA() {
  return (
    <div className="border border-dashed border-ns-border rounded-2xl p-16 text-center">
      <FilmIcon size={44} className="text-ns-gold/40 mx-auto mb-4" />
      <p className="text-ns-text font-body font-medium text-sm mb-1">No movies yet</p>
      <p className="text-ns-muted font-body text-xs mb-6">
        Search for a movie and use the &ldquo;Add to Collection&rdquo; button on its page.
      </p>
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <a
          href="/search"
          className="px-4 py-2 bg-ns-gold text-ns-bg rounded-xl text-sm font-body font-medium
                     hover:bg-amber-400 transition-colors"
        >
          Search Movies
        </a>
        <a
          href="/discover"
          className="px-4 py-2 bg-ns-surface border border-ns-border text-ns-muted rounded-xl
                     text-sm font-body hover:border-ns-gold/40 hover:text-ns-gold transition-colors"
        >
          Discover Films
        </a>
      </div>
    </div>
  )
}
