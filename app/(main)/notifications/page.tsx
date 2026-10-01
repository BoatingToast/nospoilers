import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import NotificationsPageClient from '@/components/social/NotificationsPageClient'

export const metadata: Metadata = { title: 'Notifications' }

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return <NotificationsPageClient />
}
