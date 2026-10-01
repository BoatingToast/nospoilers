import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import CreateCollectionForm from '@/components/collections/CreateCollectionForm'
import PageHeader from '@/components/ui/PageHeader'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'New Collection — NoSpoilers' }

export default async function NewCollectionPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen pb-20">
      <div className="mx-auto min-w-0 max-w-6xl px-4 sm:px-6">
        <Link href="/collections" className="mb-6 inline-flex min-h-10 items-center gap-2 font-body text-sm text-ns-muted underline-offset-4 hover:text-ns-text hover:underline">
          ← Collections
        </Link>
        <PageHeader title="NEW COLLECTION" />
        <div className="mt-8 max-w-xl">
          <CreateCollectionForm />
        </div>
      </div>
    </div>
  )
}
