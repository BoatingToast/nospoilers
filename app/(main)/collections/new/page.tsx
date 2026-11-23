import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import BackLink from '@/components/collections/BackLink'
import CreateCollectionForm from '@/components/collections/CreateCollectionForm'
import PageHeader from '@/components/ui/PageHeader'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'New Collection — NoSpoilers' }

export default async function NewCollectionPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div className="mx-auto min-h-dvh max-w-2xl px-4 pb-20 pt-6 sm:px-6 lg:pt-10">
      <BackLink href="/collections">Collections</BackLink>
      <PageHeader className="mb-8 mt-4" title="New collection." />
      <CreateCollectionForm />
    </div>
  )
}
