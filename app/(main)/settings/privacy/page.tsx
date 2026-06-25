import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import PrivacySettings from '@/components/settings/PrivacySettings'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Privacy Settings — NoSpoilers' }

export default async function PrivacySettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-ns-muted text-sm font-body hover:text-ns-text transition-colors mb-6">
        ← Back to Dashboard
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-heading text-white mb-2">Privacy Settings</h1>
        <p className="text-ns-muted text-sm font-body">
          Control who can see your ratings, watchlist, collections, and activity.
        </p>
      </div>

      <PrivacySettings />
    </div>
  )
}
