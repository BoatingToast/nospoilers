import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import type { Metadata } from 'next'
import RecommendationCenterClient from '@/components/recommendations/RecommendationCenterClient'

export const metadata: Metadata = {
  title: 'Recommendation Center — NoSpoilers',
  description: 'Your personalised movie recommendations powered by Movie DNA.',
}

export default async function MyRecommendationsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return <RecommendationCenterClient />
}
