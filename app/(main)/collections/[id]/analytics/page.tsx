import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCollection } from '@/services/collections'
import AnalyticsDashboard from '@/components/collections/AnalyticsDashboard'
import PageHeader from '@/components/ui/PageHeader'
import Link from 'next/link'
import type { Metadata } from 'next'

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await params
  return { title: 'Collection Analytics — NoSpoilers' }
}

export default async function CollectionAnalyticsPage({ params }: Props) {
  const { id }    = await params
  const session   = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const col = await getCollection(id, session.user.id)
  if (!col) notFound()

  // Only the owner can see analytics
  if (col.userId !== session.user.id) notFound()

  return (
    <div className="min-h-screen pb-20">
      <div className="mx-auto min-w-0 max-w-6xl px-4 sm:px-6">

        {/* Breadcrumb */}
        <Link href={`/collections/${id}`}
          className="mb-6 inline-flex min-h-10 items-center gap-2 font-body text-sm text-ns-muted underline-offset-4 hover:text-ns-text hover:underline">
          ← {col.title}
        </Link>

        <PageHeader title="ANALYTICS" lede="Stats for all your collections" />

        {/* Dashboard */}
        <div className="mt-10">
          <AnalyticsDashboard collectionId={id} />
        </div>

      </div>
    </div>
  )
}
