import { getServerSession } from 'next-auth'
import { authOptions }      from '@/lib/auth'
import { redirect }         from 'next/navigation'
import type { Metadata }    from 'next'
import SocialListPage       from '@/components/social/SocialListPage'

export const metadata: Metadata = { title: 'My Followers — NoSpoilers' }

export default async function FollowersPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  return <SocialListPage mode="followers" />
}
