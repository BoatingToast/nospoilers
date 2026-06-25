import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateWrapped } from '@/services/wrapped'
import WrappedExperience from '@/components/wrapped/WrappedExperience'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Your Movie Wrapped — NoSpoilers' }

export default async function WrappedPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const year    = new Date().getFullYear()
  const wrapped = await generateWrapped(session.user.id, year)

  return <WrappedExperience data={wrapped} username={session.user.name ?? 'you'} year={year} />
}
