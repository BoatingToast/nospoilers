import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCollection } from '@/services/collections'
import AnalyticsDashboard from '@/components/collections/AnalyticsDashboard'
import Link from 'next/link'
import type { Metadata } from 'next'

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const col    = await getCollection(id)
  return { title: col ? `Analytics — ${col.title}` : 'Analytics' }
}

export default async function CollectionAnalyticsPage({ params }: Props) {
  const { id }    = await params
  const session   = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const col = await getCollection(id)
  if (!col) notFound()

  // Only the owner can see analytics
  if (col.userId !== session.user.id) notFound()

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">

        {/* Breadcrumb */}
        <Link href={`/collections/${id}`}
          className="inline-flex items-center gap-2 text-ns-muted text-sm font-body hover:text-ns-text transition-colors mb-8">
          ← {col.title}
        </Link>

        {/* Header */}
        <div className="mb-10">
          <p className="text-ns-muted text-xs tracking-widest uppercase font-body mb-2 flex items-center gap-1.5">
            <span>📊</span> Creator Dashboard
          </p>
          <h1 className="font-display text-4xl sm:text-5xl tracking-wider text-ns-text mb-1">
            ANALYTICS
          </h1>
          <p className="text-ns-muted/60 text-sm font-body">
            Stats for all your collections
          </p>
        </div>

        {/* Dashboard */}
        <AnalyticsDashboard collectionId={id} />

      </div>
    </div>
  )
}
