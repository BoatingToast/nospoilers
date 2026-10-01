import { Suspense } from 'react'
import Link from 'next/link'
import CollectionSearchClient from '@/components/collections/CollectionSearchClient'
import type { Metadata } from 'next'
import { SearchIcon } from '@/components/icons'

export const metadata: Metadata = { title: 'Search Collections — NoSpoilers' }

export default function CollectionSearchPage() {
  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">

        {/* Breadcrumb */}
        <Link href="/collections"
          className="inline-flex items-center gap-2 text-ns-muted text-sm font-body hover:text-ns-text transition-colors mb-8">
          ← Collections
        </Link>

        {/* Header */}
        <div className="mb-8">
          <p className="text-ns-muted text-xs tracking-widest uppercase font-body mb-2 flex items-center gap-1.5">
            <SearchIcon size={11} /> Discover
          </p>
          <h1 className="font-display text-4xl sm:text-5xl tracking-wider text-ns-text">
            SEARCH COLLECTIONS
          </h1>
        </div>

        {/* Search + results — needs Suspense for useSearchParams */}
        <Suspense fallback={
          <div className="h-14 bg-ns-surface border border-ns-border rounded-2xl animate-pulse" />
        }>
          <CollectionSearchClient />
        </Suspense>

      </div>
    </div>
  )
}
