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
import PageHeader from '@/components/ui/PageHeader'
import Section from '@/components/ui/Section'
import Button from '@/components/ui/Button'
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
    <div className="flex flex-col gap-12">
      <WelcomeSection user={{ id: user.id, email: user.email, username: user.username, avatarUrl: user.avatarUrl ?? null, createdAt: user.createdAt }} />

      <Section
        headingId="tonight-title"
        title="What should I watch?"
        note="Ready when you are."
        href="/my-recommendations"
        linkLabel="See every pick →"
      >
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <DashboardNextFavorite />
          </div>
          <div className="min-w-0">
            <WatchlistPreview />
          </div>
        </div>
      </Section>

      <QuickActions
        ratingsCount={user._count.movieRatings}
        watchlistCount={user._count.watchlistItems}
        friendCount={friendCount}
      />

      {user._count.movieRatings < 5 && (
        <div className="flex flex-col gap-4 border-t border-ns-border pt-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <p className="font-heading text-base font-semibold text-ns-text">Make every pick more personal</p>
            <p className="mt-1 font-body text-sm leading-relaxed text-ns-muted">
              Import your Letterboxd or IMDb history to build a richer Movie DNA instantly.
            </p>
          </div>
          <Button variant="secondary" href="/settings/data" className="w-full sm:w-auto sm:flex-shrink-0">
            Import my taste
          </Button>
        </div>
      )}

      <DashboardDnaPreview profile={dnaProfile} username={user.username} />
    </div>
  )

  const recommendations = (
    <div className="space-y-12">
      <PageHeader
        title="FOR YOU"
        lede="Browse the deeper recommendation shelves when you want more than tonight's single best pick."
      />
      <RecAccuracyWidget />
      <CuratedRecsWidget />
      <RecommendationFeed />
    </div>
  )

  const friendsExtras = (
    <>
      <Section headingId="social-stats-title" title="Your circle">
        <div className="flex flex-wrap gap-6">
          <LiveSocialStats
            username={user.username}
            initialFollowers={user._count.followers}
            initialFollowing={user._count.following}
            initialFriends={friendCount}
          />
        </div>
      </Section>
      <YourSpoilerZones />
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-10">
        <FriendsActivityWidget />
        <DashboardFriendsCard />
      </div>
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-10">
        <MyActivityWidget />
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
    <div className="space-y-10">
      <PageHeader
        title="SHARE YOUR FILM"
        lede="Upload and publish a film you made without mixing creator tools into your everyday viewing dashboard."
      />
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
