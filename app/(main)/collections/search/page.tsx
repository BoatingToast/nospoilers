import { Suspense } from 'react'
import Link from 'next/link'
import CollectionSearchClient from '@/components/collections/CollectionSearchClient'
import PageHeader from '@/components/ui/PageHeader'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Search Collections — NoSpoilers' }

export default function CollectionSearchPage() {
  return (
    <div className="min-h-screen pb-20">
      <div className="mx-auto min-w-0 max-w-6xl px-4 sm:px-6">

        {/* Breadcrumb */}
        <Link href="/collections"
          className="mb-6 inline-flex min-h-10 items-center gap-2 font-body text-sm text-ns-muted underline-offset-4 hover:text-ns-text hover:underline">
          ← Collections
        </Link>

        <PageHeader title="SEARCH COLLECTIONS" />

        {/* Search + results — needs Suspense for useSearchParams */}
        <div className="mt-8">
          <Suspense fallback={
            <div className="h-14 rounded border border-ns-border bg-ns-surface" />
          }>
            <CollectionSearchClient />
          </Suspense>
        </div>

      </div>
    </div>
  )
}
