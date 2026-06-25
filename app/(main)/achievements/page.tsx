import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getUserAchievements } from '@/services/achievements'
import { getUserXP } from '@/services/xp'
import AchievementsClient from './AchievementsClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Achievements — NoSpoilers' }

export default async function AchievementsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const [achievements, xp] = await Promise.all([
    getUserAchievements(session.user.id),
    getUserXP(session.user.id),
  ])

  return <AchievementsClient achievements={achievements} xp={xp} />
}
