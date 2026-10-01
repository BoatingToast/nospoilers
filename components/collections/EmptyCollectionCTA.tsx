'use client'

import Button from '@/components/ui/Button'

// This renders on the collection detail page when movieCount === 0 and the
// viewer is the owner. The CTA links to Search so the owner has an obvious
// next step: find a movie and use the "Add to Collection" button on its page.

export default function EmptyCollectionCTA() {
  return (
    <div className="border-t border-ns-border py-8">
      <p className="mb-1 font-body text-sm font-medium text-ns-text">No movies yet</p>
      <p className="mb-5 font-body text-sm text-ns-muted">
        Search for a movie and use the &ldquo;Add to Collection&rdquo; button on its page.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button variant="primary" href="/search" className="w-full sm:w-auto">
          Search Movies
        </Button>
        <Button variant="secondary" href="/discover" className="w-full sm:w-auto">
          Discover Films
        </Button>
      </div>
    </div>
  )
}
