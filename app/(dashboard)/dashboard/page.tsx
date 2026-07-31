import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import WelcomeSection       from '@/components/dashboard/WelcomeSection'
import FavoriteMovies       from '@/components/dashboard/FavoriteMovies'
import MovieDNACard         from '@/components/dashboard/MovieDNACard'
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
import DashboardSectionNav  from '@/components/dashboard/DashboardSectionNav'
import YourSpoilerZones        from '@/components/dashboard/YourSpoilerZones'
import FriendsActivityWidget   from '@/components/dashboard/FriendsActivityWidget'
import DashboardFriendsCard    from '@/components/dashboard/DashboardFriendsCard'
import MyActivityWidget        from '@/components/dashboard/MyActivityWidget'
import LiveSocialStats         from '@/components/social/LiveSocialStats'
import { getUserPersonality } from '@/services/personality'
import { getMovieDnaProfile } from '@/services/dna'
import { upsertWrappedStats } from '@/services/activity'
import { checkAndUpdateAchievements } from '@/services/achievements'
import Link from 'next/link'
import type { Metadata } from 'next'

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

  const [dnaProfile, personality] = await Promise.all([
    getMovieDnaProfile(user.id),
    getUserPersonality(user.id),
  ])
  const friendCount    = user._count.friendshipsAsA + user._count.friendshipsAsB

  // Background tasks
  void Promise.all([
    upsertWrappedStats(user.id),
    dnaProfile ? checkAndUpdateAchievements(user.id, 'dna_updated') : null,
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

      <DashboardSectionNav />

      {user._count.movieRatings < 5 && (
        <div className="rounded-2xl border border-ns-secondary/25 bg-gradient-to-r from-ns-secondary/10 to-transparent p-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div>
            <p className="text-sm font-heading font-semibold text-ns-text">Unlock better recommendations</p>
            <p className="mt-1 text-xs font-body leading-relaxed text-ns-muted">
              Import your Letterboxd or IMDb history to build a richer Movie DNA instantly.
            </p>
          </div>
          <Link
            href="/settings/data"
            className="mt-4 inline-flex rounded-xl bg-ns-secondary px-4 py-2 text-xs font-body font-semibold text-ns-bg transition-colors hover:bg-amber-300 sm:mt-0 sm:flex-shrink-0"
          >
            Import my taste
          </Link>
        </div>
      )}

      {/* Watchlist preview */}
      <div id="dashboard-watchlist" className="scroll-mt-36">
        <WatchlistPreview />
      </div>

      {/* Personality */}
      {dnaProfile && (
        <PersonalityWidget username={user.username} initialData={personality} />
      )}

      {/* Movie DNA */}
      <div id="dashboard-dna" className="scroll-mt-36 bg-ns-surface border border-ns-border rounded-2xl p-6">
        <MovieDNACard profile={dnaProfile} compact username={user.username} />
      </div>

      {/* 🎯 Next Favorite hero + accuracy */}
      <div id="dashboard-recommendations" className="scroll-mt-36 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2"><DashboardNextFavorite /></div>
        <div className="lg:col-span-1"><RecAccuracyWidget /></div>
      </div>

      {/* Curated Recs */}
      <CuratedRecsWidget />

      {/* Your Spoiler Zones — full-width community hub */}
      <div id="dashboard-community" className="scroll-mt-36 border-t border-ns-border/30 pt-8">
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

      <div id="dashboard-favorites" className="scroll-mt-36">
        <FavoriteMovies />
      </div>
    </div>
  )

  return (
    <DashboardTabs
      overview={overview}
      dnaProfile={dnaProfile}
      username={user.username}
    />
  )
}
