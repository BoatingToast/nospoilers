import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import PrivacySettings from '@/components/settings/PrivacySettings'
import Link from 'next/link'
import PageHeader from '@/components/ui/PageHeader'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Privacy Settings — NoSpoilers' }

export default async function PrivacySettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <Link href="/dashboard" className="mb-6 inline-flex min-h-10 items-center gap-2 font-body text-sm text-ns-muted underline-offset-4 transition-colors hover:text-ns-text hover:underline">
        ← Back to Dashboard
      </Link>

      <PageHeader
        title="Privacy Settings"
        lede="Control who can see your ratings, watchlist, collections, and activity."
      />

      <div className="mt-10 grid min-w-0 gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <PrivacySettings />
      </div>
    </div>
  )
}
