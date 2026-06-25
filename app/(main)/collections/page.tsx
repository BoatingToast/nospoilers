import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserCollections } from '@/services/collections'
import CollectionCard from '@/components/collections/CollectionCard'
import CollectionBrowseClient from '@/components/collections/CollectionBrowseClient'
import CollectionSearchBar from '@/components/collections/CollectionSearchBar'
import Link from 'next/link'
import type { Metadata } from 'next'
import { CollectionsIcon } from '@/components/icons'

export const metadata: Metadata = { title: 'Collections — NoSpoilers' }

export default async function CollectionsPage() {
  const session = await getServerSession(authOptions)

  const myCollections = session
    ? await getUserCollections(session.user.id)
    : []

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-ns-muted text-xs tracking-widest uppercase font-body mb-2 flex items-center gap-1.5">
              <CollectionsIcon size={11} /> Community
            </p>
            <h1 className="font-display text-5xl sm:text-6xl tracking-wider text-ns-text">
              COLLECTIONS
            </h1>
            <p className="text-ns-muted/60 text-sm font-body mt-2">
              Curated movie lists from the community
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <Link
              href="/collections/search"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-ns-border
                         text-ns-muted text-sm font-body hover:border-ns-gold/40 hover:text-ns-gold
                         transition-all duration-200"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              Search
            </Link>
            {session && (
              <Link
                href="/collections/new"
                className="px-5 py-2.5 bg-ns-gold text-ns-bg rounded-xl text-sm font-body font-medium
                           hover:bg-ns-gold/90 transition-colors"
              >
                + New Collection
              </Link>
            )}
          </div>
        </div>

        {/* Quick search */}
        <div className="mb-10">
          <CollectionSearchBar placeholder="Search collections, creators, movies…" />
        </div>

        {/* My collections (if logged in and has some) */}
        {session && myCollections.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-2xl tracking-wider text-ns-text">MY COLLECTIONS</h2>
              <Link href="/collections/new"
                className="text-ns-gold text-xs font-body hover:text-amber-400 transition-colors">
                + New
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {myCollections.map(col => (
                <CollectionCard key={col.id} collection={col} isOwner />
              ))}
            </div>
          </section>
        )}

        {/* Community discovery tabs */}
        <section>
          <div className="flex items-center justify-between mb-0">
            <h2 className="font-display text-2xl tracking-wider text-ns-text mb-0">COMMUNITY</h2>
            <Link href="/collections/trending"
              className="text-ns-gold text-xs font-body hover:text-amber-400 transition-colors">
              View trending →
            </Link>
          </div>
          <CollectionBrowseClient initialTab="trending" />
        </section>

      </div>
    </div>
  )
}
