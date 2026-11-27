import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCollection } from '@/services/collections'
import AnalyticsDashboard from '@/components/collections/AnalyticsDashboard'
import BackLink from '@/components/collections/BackLink'
import PageHeader from '@/components/ui/PageHeader'
import type { Metadata } from 'next'

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await params
  return { title: 'Collection Analytics' }
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
    <div className="mx-auto min-h-dvh max-w-5xl px-4 pb-20 pt-6 sm:px-6 lg:pt-10">
      <BackLink href={`/collections/${id}`}>{col.title}</BackLink>
      <PageHeader className="mb-10 mt-4" title="Analytics." description="Stats for all your collections" />
      <AnalyticsDashboard collectionId={id} />
    </div>
  )
}
