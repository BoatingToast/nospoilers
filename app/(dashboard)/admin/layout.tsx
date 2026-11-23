import { notFound, redirect } from 'next/navigation'
import { audienceUser } from '@/lib/audience-api'
import { AudienceError } from '@/lib/audience-engine'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await audienceUser(true)
  } catch (error) {
    if (error instanceof AudienceError && error.status === 401) redirect('/login')
    if (error instanceof AudienceError && error.status === 403) notFound()
    throw error
  }
  return children
}
