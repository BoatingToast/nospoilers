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
import YourSpoilerZones        from '@/components/dashboard/YourSpoilerZones'
import FriendsActivityWidget   from '@/components/dashboard/FriendsActivityWidget'
import DashboardFriendsCard    from '@/components/dashboard/DashboardFriendsCard'
import MyActivityWidget        from '@/components/dashboard/MyActivityWidget'
import LiveSocialStats         from '@/components/social/LiveSocialStats'
import { getUserPersonality } from '@/services/personality'
import { getMovieDnaProfile } from '@/services/dna'
import Button from '@/components/ui/Button'
import SectionHeading, { SectionLink } from '@/components/dashboard/SectionHeading'
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
    <div className="flex flex-col gap-8 lg:gap-10">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start lg:gap-6">
        <div className="flex min-w-0 flex-col gap-8 lg:col-span-7">
          <section aria-labelledby="tonight-title">
            <SectionHeading
              id="tonight-title"
              title="What should I watch?"
              action={<SectionLink href="/my-recommendations">See every pick</SectionLink>}
            />
            <DashboardNextFavorite />
          </section>
          <DashboardDnaPreview profile={dnaProfile} username={user.username} />
        </div>
        <WatchlistPreview className="lg:col-span-5" />
      </div>

      {user._count.movieRatings < 5 && (
        <div className="ns-reveal flex flex-col gap-4 rounded-2xl bg-ns-tile-yellow p-6 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div>
            <p className="font-heading text-lg font-bold text-ns-text">Make every pick more personal</p>
            <p className="mt-1 text-base leading-relaxed text-ns-muted">
              Import your Letterboxd or IMDb history to build a richer Movie DNA instantly.
            </p>
          </div>
          <Button variant="secondary" href="/settings/data" className="flex-shrink-0 self-start sm:self-auto">
            Import my taste
          </Button>
        </div>
      )}

      <QuickActions
        ratingsCount={user._count.movieRatings}
        watchlistCount={user._count.watchlistItems}
        friendCount={friendCount}
      />
    </div>
  )

  const recommendations = (
    <div className="space-y-8">
      <SectionHeading
        title="For you"
        description="Browse the deeper recommendation shelves when you want more than tonight's single best pick."
      />
      <RecAccuracyWidget />
      <CuratedRecsWidget />
      <RecommendationFeed />
    </div>
  )

  const friendsExtras = (
    <>
      <section aria-labelledby="social-stats-title" className="rounded-2xl bg-ns-surface p-6">
        <h2 id="social-stats-title" className="mb-4 font-heading text-lg font-bold text-ns-text">Your circle</h2>
        <div className="flex flex-wrap gap-6">
          <LiveSocialStats
            username={user.username}
            initialFollowers={user._count.followers}
            initialFollowing={user._count.following}
            initialFriends={friendCount}
          />
        </div>
      </section>
      <YourSpoilerZones />
      <FriendsActivityWidget />
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

  return (
    <DashboardRecommendationsProvider>
      <div className="flex flex-col gap-8">
        <WelcomeSection user={{ id: user.id, email: user.email, username: user.username, avatarUrl: user.avatarUrl ?? null, createdAt: user.createdAt }} />
        <DashboardTabs
          overview={overview}
          recommendations={recommendations}
          friendsExtras={friendsExtras}
          dnaExtras={dnaExtras}
          dnaProfile={dnaProfile}
          username={user.username}
        />
      </div>
    </DashboardRecommendationsProvider>
  )
}
