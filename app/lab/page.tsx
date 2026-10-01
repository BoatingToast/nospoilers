import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { hasProAccess } from '@/lib/pro-access'
import LabWorkspace from '@/components/lab/LabWorkspace'

export const metadata: Metadata = {
  title: 'NoSpoilers Lab — Make your next film',
  description: 'Your footage. Your cut. A filmmaking workspace for the first frame through the final export.',
  robots: { index: false, follow: true },
}

export default async function LabPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login?callbackUrl=%2Flab')
  if (!hasProAccess(session.user.email)) redirect('/pro/access?feature=lab')
  return <LabWorkspace ownerId={session.user.id} />
}
