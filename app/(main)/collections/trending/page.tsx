import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTrendingCollections } from '@/services/collection-community'
import EnrichedCollectionCard from '@/components/collections/EnrichedCollectionCard'
import PageHeader from '@/components/ui/PageHeader'
import Button from '@/components/ui/Button'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Trending Collections — NoSpoilers' }

// Revalidate every 5 minutes so trending stays fresh
export const revalidate = 300

export default async function TrendingCollectionsPage() {
  const session     = await getServerSession(authOptions)
  const collections = await getTrendingCollections(session?.user?.id, 48)

  return (
    <div className="min-h-screen pb-20">
      <div className="mx-auto min-w-0 max-w-6xl px-4 sm:px-6">

        {/* Breadcrumb */}
        <Link href="/collections"
          className="mb-6 inline-flex min-h-10 items-center gap-2 font-body text-sm text-ns-muted underline-offset-4 hover:text-ns-text hover:underline">
          ← Collections
        </Link>

        <PageHeader title="TRENDING" lede="Ranked by upvote confidence score + recent activity" />

        {collections.length === 0 ? (
          <div className="mt-8 border-t border-ns-border py-8">
            <p className="font-body text-sm text-ns-muted">No trending collections yet.</p>
            <Button variant="primary" href="/collections/new" className="mt-4">
              Create the first one
            </Button>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {collections.map((col, i) => (
              <EnrichedCollectionCard
                key={col.id}
                collection={col}
                rank={i + 1}
                showVotes
              />
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
