import { Suspense } from 'react'
import BackLink from '@/components/collections/BackLink'
import CollectionSearchClient from '@/components/collections/CollectionSearchClient'
import PageHeader from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Search Collections' }

export default function CollectionSearchPage() {
  return (
    <div className="mx-auto min-h-dvh max-w-7xl px-4 pb-20 pt-6 sm:px-6 lg:pt-10">
      <BackLink href="/collections">Collections</BackLink>
      <PageHeader className="mb-8 mt-4" title="Search collections." />

      {/* Search + results — needs Suspense for useSearchParams */}
      <Suspense fallback={<Skeleton className="h-14 rounded-2xl" />}>
        <CollectionSearchClient />
      </Suspense>
    </div>
  )
}
