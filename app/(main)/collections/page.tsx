import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserCollections } from '@/services/collections'
import CollectionCard from '@/components/collections/CollectionCard'
import CollectionBrowseClient from '@/components/collections/CollectionBrowseClient'
import CollectionSearchBar from '@/components/collections/CollectionSearchBar'
import PageHeader from '@/components/ui/PageHeader'
import Section from '@/components/ui/Section'
import Button from '@/components/ui/Button'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Collections — NoSpoilers' }

export default async function CollectionsPage() {
  const session = await getServerSession(authOptions)

  const myCollections = session
    ? await getUserCollections(session.user.id)
    : []

  return (
    <div className="min-h-screen pb-20">
      <div className="mx-auto min-w-0 max-w-6xl px-4 sm:px-6">

        <PageHeader title="COLLECTIONS" lede="Curated movie lists from the community">
          <div className="w-full min-w-0">
            <CollectionSearchBar placeholder="Search collections, creators, movies…" />
          </div>
          {session && (
            <Button variant="primary" href="/collections/new" className="w-full sm:w-auto">
              + New Collection
            </Button>
          )}
          <Button variant="secondary" href="/collections/search" className="w-full sm:w-auto">
            Search
          </Button>
        </PageHeader>

        {/* My collections (if logged in and has some) */}
        {session && myCollections.length > 0 && (
          <Section title="MY COLLECTIONS" href="/collections/new" linkLabel="+ New" className="mt-12">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {myCollections.map(col => (
                <CollectionCard key={col.id} collection={col} isOwner />
              ))}
            </div>
          </Section>
        )}

        {/* Community discovery tabs */}
        <Section title="COMMUNITY" href="/collections/trending" linkLabel="View trending →" className="mt-12">
          <CollectionBrowseClient initialTab="trending" />
        </Section>

      </div>
    </div>
  )
}
