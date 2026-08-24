import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import WelcomeSection       from '@/components/dashboard/WelcomeSection'
import DashboardDnaPreview from '@/components/dashboard/DashboardDnaPreview'
import FavoriteMovies       from '@/components/dashboard/FavoriteMovies'
import RecommendationFeed   from '@/components/recommendations/RecommendationFeed'
import PersonalityWidget    from '@/components/dashboard/PersonalityWidget'
import SimilarUsersWidget   from '@/components/dashboard/SimilarUsersWidget'
import WatchlistPreview     from '@/components/dashboard/WatchlistPreview'
import CuratedRecsWidget    from '@/components/recommendations/CuratedRecsWidget'
import DashboardNextFavorite from '@/components/recommendations/DashboardNextFavorite'
import DashboardRecommendationsProvider from '@/components/recommendations/DashboardRecommendationsProvider'
import RecAccuracyWidget    from '@/components/recommendations/RecAccuracyWidget'
import DashboardTabs        from '@/components/dashboard/DashboardTabs'
import QuickActions         from '@/components/dashboard/QuickActions'
import UploadMovieSection   from '@/components/dashboard/UploadMovieSection'
import YourSpoilerZones        from '@/components/dashboard/YourSpoilerZones'
import FriendsActivityWidget   from '@/components/dashboard/FriendsActivityWidget'
import DashboardFriendsCard    from '@/components/dashboard/DashboardFriendsCard'
import MyActivityWidget        from '@/components/dashboard/MyActivityWidget'
import LiveSocialStats         from '@/components/social/LiveSocialStats'
import { getUserPersonality } from '@/services/personality'
import { getMovieDnaProfile } from '@/services/dna'
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

  // ── Overview tab content (server-rendered) ────────────────────────────────
  const overview = (
    <div className="flex flex-col gap-7">
      <WelcomeSection user={{ id: user.id, email: user.email, username: user.username, avatarUrl: user.avatarUrl ?? null, createdAt: user.createdAt }} />

      <section aria-labelledby="tonight-title">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-body uppercase tracking-[0.2em] text-ns-secondary-readable">Ready when you are</p>
            <h2 id="tonight-title" className="mt-1 font-heading text-base font-semibold text-ns-text">What should I watch?</h2>
          </div>
          <Link href="/my-recommendations" className="text-xs font-body text-ns-muted transition-colors hover:text-ns-secondary-readable">
            See every pick →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <DashboardNextFavorite />
          </div>
          <div className="lg:col-span-2">
            <WatchlistPreview />
          </div>
        </div>
      </section>

      <QuickActions
        ratingsCount={user._count.movieRatings}
        watchlistCount={user._count.watchlistItems}
        friendCount={friendCount}
      />

      {user._count.movieRatings < 5 && (
        <div className="rounded-2xl border border-ns-secondary/25 bg-gradient-to-r from-ns-secondary/10 to-transparent p-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div>
            <p className="text-sm font-heading font-semibold text-ns-text">Make every pick more personal</p>
            <p className="mt-1 text-xs font-body leading-relaxed text-ns-muted">
              Import your Letterboxd or IMDb history to build a richer Movie DNA instantly.
            </p>
          </div>
          <Link
            href="/settings/data"
            className="mt-4 inline-flex rounded-xl bg-ns-secondary px-4 py-2 text-xs font-body font-semibold text-ns-secondary-foreground transition-colors hover:bg-amber-300 hover:text-ns-bg sm:mt-0 sm:flex-shrink-0"
          >
            Import my taste
          </Link>
        </div>
      )}

      <DashboardDnaPreview profile={dnaProfile} username={user.username} />
    </div>
  )

  const recommendations = (
    <div className="space-y-8">
      <div>
        <p className="text-[10px] font-body uppercase tracking-[0.2em] text-ns-secondary-readable">Your taste, decoded</p>
        <h1 className="mt-1 font-display text-3xl tracking-wider text-ns-text sm:text-4xl">FOR YOU</h1>
        <p className="mt-2 max-w-2xl text-sm font-body leading-relaxed text-ns-muted">
          Browse the deeper recommendation shelves when you want more than tonight&apos;s single best pick.
        </p>
      </div>
      <RecAccuracyWidget />
      <CuratedRecsWidget />
      <RecommendationFeed />
    </div>
  )

  const friendsExtras = (
    <>
      <section aria-labelledby="social-stats-title" className="rounded-2xl border border-ns-border bg-ns-surface p-5">
        <p id="social-stats-title" className="mb-4 text-[10px] font-body uppercase tracking-[0.2em] text-ns-muted">Your circle</p>
        <div className="flex flex-wrap gap-6">
          <LiveSocialStats
            username={user.username}
            initialFollowers={user._count.followers}
            initialFollowing={user._count.following}
            initialFriends={friendCount}
          />
        </div>
      </section>
      <div>
        <YourSpoilerZones />
      </div>
      <div>
        <FriendsActivityWidget />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DashboardFriendsCard />
        <MyActivityWidget />
      </div>
      <div className="max-w-xl">
        <SimilarUsersWidget />
      </div>
    </>
  )

  const dnaExtras = (
    <>
      {dnaProfile && <PersonalityWidget username={user.username} initialData={personality} />}
      <FavoriteMovies />
    </>
  )

  const creator = (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-body uppercase tracking-[0.2em] text-ns-secondary-readable">Creator Studio</p>
        <h1 className="mt-1 font-display text-3xl tracking-wider text-ns-text sm:text-4xl">SHARE YOUR FILM</h1>
        <p className="mt-2 max-w-2xl text-sm font-body leading-relaxed text-ns-muted">
          Upload and publish a film you made without mixing creator tools into your everyday viewing dashboard.
        </p>
      </div>
      <UploadMovieSection />
    </div>
  )

  return (
    <DashboardRecommendationsProvider>
      <DashboardTabs
        overview={overview}
        recommendations={recommendations}
        friendsExtras={friendsExtras}
        dnaExtras={dnaExtras}
        creator={creator}
        dnaProfile={dnaProfile}
        username={user.username}
      />
    </DashboardRecommendationsProvider>
  )
}
