import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasProAccess } from '@/lib/pro-access'
import { publicPageMetadata } from '@/lib/seo'
import ProLobby from '@/components/pro/ProLobby'

export const metadata = publicPageMetadata({
  title: 'Pro Lobby — Your Personal Movie Night',
  description: 'Find your next film, chat with Lumi, plan a double feature, and explore your movie taste in the NoSpoilers Pro lobby.',
  path: '/pro',
})

export default async function ProPage() {
  const session = await getServerSession(authOptions)
  return <ProLobby hasAccess={Boolean(session?.user?.id && hasProAccess(session.user.email))} />
}
