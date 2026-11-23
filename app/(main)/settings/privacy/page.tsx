import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import PrivacySettings from '@/components/settings/PrivacySettings'
import PageHeader from '@/components/ui/PageHeader'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Privacy Settings — NoSpoilers' }

export default async function PrivacySettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <>
      <PageHeader
        title="Privacy settings"
        description="Control who can see your ratings, watchlist, collections, and activity."
      />
      <div className="mt-8">
        <PrivacySettings />
      </div>
    </>
  )
}
