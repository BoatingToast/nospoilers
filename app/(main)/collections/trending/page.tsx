import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTrendingCollections } from '@/services/collection-community'
import EnrichedCollectionCard from '@/components/collections/EnrichedCollectionCard'
import Link from 'next/link'
import type { Metadata } from 'next'
import { TrendingIcon, CollectionsIcon } from '@/components/icons'

export const metadata: Metadata = { title: 'Trending Collections — NoSpoilers' }

// Revalidate every 5 minutes so trending stays fresh
export const revalidate = 300

export default async function TrendingCollectionsPage() {
  const session     = await getServerSession(authOptions)
  const collections = await getTrendingCollections(session?.user?.id, 48)

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">

        {/* Breadcrumb */}
        <Link href="/collections"
          className="inline-flex items-center gap-2 text-ns-muted text-sm font-body hover:text-ns-text transition-colors mb-8">
          ← Collections
        </Link>

        {/* Header */}
        <div className="mb-10">
          <p className="text-ns-muted text-xs tracking-widest uppercase font-body mb-2 flex items-center gap-1.5">
            <TrendingIcon size={11} /> Right now
          </p>
          <h1 className="font-display text-5xl sm:text-6xl tracking-wider text-ns-text mb-2">
            TRENDING
          </h1>
          <p className="text-ns-muted/60 text-sm font-body">
            Ranked by upvote confidence score + recent activity
          </p>
        </div>

        {collections.length === 0 ? (
          <div className="border border-dashed border-ns-border rounded-2xl p-16 text-center">
            <CollectionsIcon size={44} className="text-ns-gold/40 mx-auto mb-4" />
            <p className="text-ns-muted font-body text-sm">No trending collections yet.</p>
            <Link href="/collections/new"
              className="inline-block mt-4 px-4 py-2 bg-ns-gold text-ns-bg rounded-xl text-sm font-body font-medium hover:bg-ns-gold/90 transition-colors">
              Create the first one
            </Link>
          </div>
        ) : (
          <>
            {/* Top 3 podium */}
            {collections.length >= 3 && (
              <div className="grid grid-cols-3 gap-4 mb-10">
                {[1, 0, 2].map(rank => {
                  const col = collections[rank]
                  const pos = rank + 1
                  return (
                    <div key={col.id}
                      className={`${rank === 0 ? 'mt-0' : 'mt-6'}`}>
                      <EnrichedCollectionCard
                        collection={col}
                        rank={pos}
                        showVotes
                      />
                    </div>
                  )
                })}
              </div>
            )}

            {/* Rest of list */}
            {collections.length > 3 && (
              <>
                <div className="h-px bg-ns-border mb-8" />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {collections.slice(3).map((col, i) => (
                    <EnrichedCollectionCard
                      key={col.id}
                      collection={col}
                      rank={i + 4}
                      showVotes
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}

      </div>
    </div>
  )
}
