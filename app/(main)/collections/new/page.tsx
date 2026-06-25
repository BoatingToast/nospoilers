import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import CreateCollectionForm from '@/components/collections/CreateCollectionForm'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'New Collection — NoSpoilers' }

export default async function NewCollectionPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-xl mx-auto px-4 sm:px-6">
        <Link href="/collections" className="inline-flex items-center gap-2 text-ns-muted text-sm font-body hover:text-ns-text transition-colors mb-8">
          ← Collections
        </Link>
        <h1 className="font-display text-4xl sm:text-5xl tracking-wider text-ns-text mb-8">
          NEW COLLECTION
        </h1>
        <CreateCollectionForm />
      </div>
    </div>
  )
}
