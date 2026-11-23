import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'

// This renders on the collection detail page when movieCount === 0 and the
// viewer is the owner. The owner adds films from a movie's page, so the CTA
// links to Search and Discover as the obvious next steps.

export default function EmptyCollectionCTA() {
  return (
    <EmptyState
      title="No movies yet"
      description={<>Search for a movie and use the &ldquo;Add to Collection&rdquo; button on its page.</>}
      action={
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button href="/search">Search movies</Button>
          <Button href="/discover" variant="outline">Discover films</Button>
        </div>
      }
    />
  )
}
