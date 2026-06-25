import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import WelcomeSection       from '@/components/dashboard/WelcomeSection'
import FavoriteMovies       from '@/components/dashboard/FavoriteMovies'
import MovieDNACard         from '@/components/dashboard/MovieDNACard'
import TasteSummary         from '@/components/dashboard/TasteSummary'
import RecommendationFeed   from '@/components/recommendations/RecommendationFeed'
import PersonalityWidget    from '@/components/dashboard/PersonalityWidget'
import SimilarUsersWidget   from '@/components/dashboard/SimilarUsersWidget'
import WatchlistPreview     from '@/components/dashboard/WatchlistPreview'
import AchievementWidget    from '@/components/dashboard/AchievementWidget'
import CuratedRecsWidget    from '@/components/recommendations/CuratedRecsWidget'
import DashboardNextFavorite from '@/components/recommendations/DashboardNextFavorite'
import RecAccuracyWidget    from '@/components/recommendations/RecAccuracyWidget'
import DnaEvolutionWidget   from '@/components/dashboard/DnaEvolutionWidget'
import DashboardTabs        from '@/components/dashboard/DashboardTabs'
import YourSpoilerZones        from '@/components/dashboard/YourSpoilerZones'
import FriendsActivityWidget   from '@/components/dashboard/FriendsActivityWidget'
import DashboardFriendsCard    from '@/components/dashboard/DashboardFriendsCard'
import MyActivityWidget        from '@/components/dashboard/MyActivityWidget'
import LiveSocialStats         from '@/components/social/LiveSocialStats'
import { getUserPersonality } from '@/services/personality'
import { upsertWrappedStats } from '@/services/activity'
import { checkAndUpdateAchievements } from '@/services/achievements'
import Link from 'next/link'
import type { Metadata } from 'next'
import type { DNAScores } from '@/types'

export const metadata: Metadata = { title: 'Dashboard — NoSpoilers' }

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true, email: true, username: true, avatarUrl: true, createdAt: true,
      tasteProfile: true,
      _count: {
        select: {
          movieRatings:   true,
          watchlistItems: true,
          friendshipsAsA: true,
          friendshipsAsB: true,
          followers:      true,
          following:      true,
        },
      },
    },
  })
  if (!user) redirect('/login')

  const dnaScores: DNAScores | null = user.tasteProfile ? {
    suspenseScore:        user.tasteProfile.suspenseScore,
    emotionalImpactScore: user.tasteProfile.emotionalImpactScore,
    complexityScore:      user.tasteProfile.complexityScore,
    humorScore:           user.tasteProfile.humorScore,
    realismScore:         user.tasteProfile.realismScore,
    actionScore:          user.tasteProfile.actionScore,
    darknessScore:        user.tasteProfile.darknessScore,
  } : null

  const personality    = await getUserPersonality(user.id)
  const friendCount    = user._count.friendshipsAsA + user._count.friendshipsAsB

  // Background tasks
  void Promise.all([
    upsertWrappedStats(user.id),
    user.tasteProfile ? checkAndUpdateAchievements(user.id, 'dna_updated') : null,
  ]).catch(() => {})

  // ── Overview tab content (server-rendered) ────────────────────────────────
  const overview = (
    <div className="flex flex-col gap-8">
      <WelcomeSection user={{ id: user.id, email: user.email, username: user.username, avatarUrl: user.avatarUrl ?? null, createdAt: user.createdAt }} />

      {/* Stats row */}
      <div className="flex flex-wrap gap-6 -mt-2">
        {/* Followers / Following / Friends — live-updating client component */}
        <LiveSocialStats
          username={user.username}
          initialFollowers={user._count.followers}
          initialFollowing={user._count.following}
          initialFriends={friendCount}
        />
        <div className="w-px h-8 bg-ns-border/40 self-center hidden sm:block" />
        <div>
          <p className="font-display text-3xl tracking-wider text-white">{user._count.movieRatings}</p>
          <p className="text-ns-muted text-xs font-body mt-0.5">Ratings</p>
        </div>
        <div>
          <p className="font-display text-3xl tracking-wider text-white">{user._count.watchlistItems}</p>
          <p className="text-ns-muted text-xs font-body mt-0.5">Watchlist</p>
        </div>
      </div>

      {/* Watchlist preview */}
      <WatchlistPreview />

      {/* Personality */}
      {dnaScores && (
        <PersonalityWidget username={user.username} initialData={personality} />
      )}

      {/* 🎯 Next Favorite hero + accuracy */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2"><DashboardNextFavorite /></div>
        <div className="lg:col-span-1"><RecAccuracyWidget /></div>
      </div>

      {/* Curated Recs */}
      <CuratedRecsWidget />

      {/* Your Spoiler Zones — full-width community hub */}
      <div className="border-t border-ns-border/30 pt-8">
        <YourSpoilerZones />
      </div>

      {/* Friends Activity */}
      <div className="border-t border-ns-border/30 pt-8">
        <FriendsActivityWidget />
      </div>

      {/* Friends + My Activity side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 border-t border-ns-border/30 pt-8">
        <DashboardFriendsCard />
        <MyActivityWidget />
      </div>

      {/* Two-column: recs + similar users */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2"><RecommendationFeed /></div>
        <div className="lg:col-span-1">
          <SimilarUsersWidget />
        </div>
      </div>

      <FavoriteMovies />
    </div>
  )

  return (
    <DashboardTabs
      overview={overview}
      dnaScores={dnaScores}
      username={user.username}
    />
  )
}
