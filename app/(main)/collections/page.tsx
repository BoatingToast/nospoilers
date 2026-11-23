import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserCollections } from '@/services/collections'
import CollectionCard from '@/components/collections/CollectionCard'
import CollectionBrowseClient from '@/components/collections/CollectionBrowseClient'
import CollectionSearchBar from '@/components/collections/CollectionSearchBar'
import Button from '@/components/ui/Button'
import PageHeader from '@/components/ui/PageHeader'
import { ArrowRightIcon, PlusIcon } from '@/components/icons'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Collections — NoSpoilers' }

export default async function CollectionsPage() {
  const session = await getServerSession(authOptions)

  const myCollections = session
    ? await getUserCollections(session.user.id)
    : []

  return (
    <div className="mx-auto min-h-dvh max-w-7xl px-4 pb-20 pt-10 sm:px-6 lg:pt-16">
      <PageHeader
        title="Collections."
        description="Curated movie lists from the community"
        actions={session ? (
          <Button href="/collections/new"><PlusIcon size={16} /> New collection</Button>
        ) : undefined}
      />

      <div className="mb-12 mt-8 max-w-2xl">
        <CollectionSearchBar placeholder="Search collections, creators, movies…" />
      </div>

      {session && myCollections.length > 0 && (
        <section className="mb-14">
          <h2 className="mb-5 font-display text-3xl text-ns-text">My collections</h2>
          <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 scrollbar-hide sm:-mx-6 sm:px-6">
            {myCollections.map(col => (
              <div key={col.id} className="w-36 flex-shrink-0 sm:w-44">
                <CollectionCard collection={col} isOwner />
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="font-display text-3xl text-ns-text">Community</h2>
          <Link
            href="/collections/trending"
            className="inline-flex min-h-11 flex-shrink-0 items-center gap-1 text-sm font-semibold text-ns-secondary-readable transition-colors duration-150 hover:text-ns-text"
          >
            View trending <ArrowRightIcon size={15} />
          </Link>
        </div>
        <CollectionBrowseClient initialTab="trending" />
      </section>
    </div>
  )
}
