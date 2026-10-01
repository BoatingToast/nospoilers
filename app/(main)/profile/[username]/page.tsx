import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getPersonalityBySlug } from '@/services/personality'
import { getMovieDnaProfile } from '@/services/dna'
import MovieDNACard from '@/components/dashboard/MovieDNACard'
import PersonalityBadge from '@/components/profile/PersonalityBadge'
import TasteCard from '@/components/profile/TasteCard'
import ProfileTabs from '@/components/profile/ProfileTabs'
import FollowButton              from '@/components/social/FollowButton'
import SocialStats               from '@/components/social/SocialStats'
import ProfileTop5Section        from '@/components/top-five/ProfileTop5Section'
import SpoilerZoneMemberships   from '@/components/profile/SpoilerZoneMemberships'
import { LockIcon, FriendsIcon, RecsIcon } from '@/components/icons'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import PageHeader from '@/components/ui/PageHeader'
import Section from '@/components/ui/Section'
import type { Metadata } from 'next'
import type { DNAScores } from '@/types'

interface Props {
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  return {
    title: `@${username} — NoSpoilers`,
    description: `${username}'s movie taste profile on NoSpoilers`,
    openGraph: { images: [`/api/og/${username}`] },
  }
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params
  const session = await getServerSession(authOptions)

  const user = await prisma.user.findUnique({
    where:  { username },
    select: {
      id: true, username: true, createdAt: true,
      onboardingCompleted: true,
      avatarUrl:        true,
      displayName:      true,
      bio:              true,
      tasteProfile:     true,
      onboardingMovies: {
        select:  { tmdbId: true, title: true, posterPath: true },
        orderBy: { addedAt: 'asc' },
      },
      topFiveMovies: {
        select:  { tmdbId: true, title: true, posterPath: true },
        orderBy: { position: 'asc' },
        take:    3,
      },
      preferences:  { select: { genres: true } },
      personality:  { select: { primaryType: true, secondaryType: true } },
      _count: {
        select: {
          followers:      true,
          following:      true,
          movieRatings:   true,
          watchlistItems: true,
          collections:    true,
        },
      },
    },
  })

  if (!user || !user.onboardingCompleted) notFound()

  const isOwnProfile = session?.user?.id === user.id

  // Watched count (status = 'watched')
  const watchedCount = await prisma.watchlistItem.count({
    where: { userId: user.id, status: 'watched' },
  })

  // Social data for non-own-profile views
  let isFollowing = false
  let isFriend    = false
  if (!isOwnProfile && session?.user?.id) {
    const myId = session.user.id
    const [followRow, friendRow] = await Promise.all([
      prisma.userFollow.findUnique({
        where: { followerId_followingId: { followerId: myId, followingId: user.id } },
        select: { id: true },
      }),
      prisma.friendship.findFirst({
        where: {
          OR: [
            { userAId: myId, userBId: user.id },
            { userBId: myId, userAId: user.id },
          ],
        },
        select: { id: true },
      }),
    ])
    isFollowing = !!followRow
    isFriend    = !!friendRow
  }

  // Friend count = number of mutual follow pairs
  const friendCount = await prisma.friendship.count({
    where: { OR: [{ userAId: user.id }, { userBId: user.id }] },
  })

  const dnaProfile = await getMovieDnaProfile(user.id)
  const dnaScores: DNAScores | null = user.tasteProfile ? {
    suspenseScore:        user.tasteProfile.suspenseScore,
    emotionalImpactScore: user.tasteProfile.emotionalImpactScore,
    complexityScore:      user.tasteProfile.complexityScore,
    humorScore:           user.tasteProfile.humorScore,
    realismScore:         user.tasteProfile.realismScore,
    actionScore:          user.tasteProfile.actionScore,
    darknessScore:        user.tasteProfile.darknessScore,
  } : null

  const primaryPersonality   = user.personality ? getPersonalityBySlug(user.personality.primaryType) : null
  const secondaryPersonality = user.personality?.secondaryType ? getPersonalityBySlug(user.personality.secondaryType) : null
  const identityMovies = user.topFiveMovies.length > 0
    ? user.topFiveMovies
    : user.onboardingMovies.slice(0, 3)

  const genres = user.preferences?.genres ?? []

  return (
    <div className="min-h-screen pb-20">
      <div className="mx-auto max-w-6xl px-4 pt-2 sm:px-6">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <PageHeader
          title={`@${user.username.toUpperCase()}`}
          className="[&_h1]:[overflow-wrap:anywhere]"
          lede={
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <Avatar
                  src={user.avatarUrl ?? null}
                  username={user.username}
                  size="lg"
                  href={false}
                />
              </div>
              <div className="min-w-0">
                {user.displayName && (
                  <p className="font-heading text-base font-semibold text-ns-text">{user.displayName}</p>
                )}
                {user.bio && (
                  <p className="mt-1 text-sm font-body leading-relaxed text-ns-muted">{user.bio}</p>
                )}
                <p className="mt-1 text-xs font-body text-ns-muted">
                  Member since {new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(user.createdAt)}
                </p>
              </div>
            </div>
          }
        >
          <div className="w-full min-w-0">
            {/* Social stats (clickable) */}
            <div className="border-t border-ns-border pt-4">
              <SocialStats
                username={user.username}
                followerCount={user._count.followers}
                followingCount={user._count.following}
                friendCount={friendCount}
              />
            </div>

            {/* Movie stats */}
            <dl className="mt-4 grid grid-cols-3 gap-4 border-t border-ns-border pt-4">
              {[
                { label: 'Movies Watched', value: watchedCount },
                { label: 'Ratings',        value: user._count.movieRatings },
                { label: 'Collections',    value: user._count.collections },
              ].map(s => (
                <div key={s.label} className="min-w-0">
                  <dd className="font-display text-3xl leading-none tracking-wide text-ns-secondary-readable">{s.value}</dd>
                  <dt className="mt-1 text-xs font-body text-ns-muted">{s.label}</dt>
                </div>
              ))}
            </dl>

            {/* Actions */}
            <div className="mt-5 flex flex-col gap-3 border-t border-ns-border pt-4 sm:flex-row sm:flex-wrap sm:items-center">
              {isOwnProfile ? (
                <>
                  <Button variant="secondary" href="/settings/profile">
                    Edit Profile
                  </Button>
                  <Button variant="outline" href="/settings/privacy">
                    <LockIcon size={14} /> Privacy
                  </Button>
                  <Button variant="outline" href="/friends">
                    <FriendsIcon size={14} /> Friends
                  </Button>
                </>
              ) : session ? (
                <>
                  <FollowButton
                    username={user.username}
                    initialIsFollowing={isFollowing}
                    initialIsFriend={isFriend}
                    sessionUserId={session.user.id}
                  />
                  <Button variant="secondary" href={`/compatibility/${user.username}`}>
                    <RecsIcon size={14} /> Compare Taste
                  </Button>
                </>
              ) : (
                <Button
                  variant="primary"
                  href={`/register?callbackUrl=${encodeURIComponent(`/compatibility/${user.username}`)}`}
                  className="text-center"
                >
                  <RecsIcon size={14} className="flex-shrink-0" /> Compare your taste with @{user.username}
                </Button>
              )}
            </div>
          </div>
        </PageHeader>

        {/* ── Top 5 Films ─────────────────────────────────────────────────── */}
        <div className="mt-12">
          <ProfileTop5Section userId={user.id} isOwn={isOwnProfile} />
        </div>

        {/* ── Taste profile ───────────────────────────────────────────────── */}
        <Section
          className="mt-14"
          title="YOUR MOVIE IDENTITY"
          note="The personalities, genres, and story traits that shape what you love to watch."
        >
          <div className={`grid min-w-0 grid-cols-1 gap-10 ${primaryPersonality ? 'lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]' : ''}`}>
            {primaryPersonality && (
              <div className="min-w-0">
                <PersonalityBadge primary={primaryPersonality} secondary={secondaryPersonality} />

                {genres.length > 0 && (
                  <FavoriteGenres genres={genres} />
                )}
              </div>
            )}

            <div className="min-w-0">
              <TasteCard
                username={user.username}
                personality={primaryPersonality}
                dnaScores={dnaScores}
                topMovies={identityMovies.map(m => m.title)}
              />

              {!primaryPersonality && genres.length > 0 && (
                <FavoriteGenres genres={genres} />
              )}
            </div>
          </div>
        </Section>

        {dnaProfile && (
          <div className="mt-14 min-w-0 border-t-2 border-ns-text pt-4">
            <MovieDNACard profile={dnaProfile} username={user.username} />
          </div>
        )}

        <SpoilerZoneMemberships userId={user.id} />

        {/* ── Movie library ───────────────────────────────────────────────── */}
        <Section className="mt-14" title="WATCHED, SAVED & COLLECTED">
          <ProfileTabs
            username={user.username}
            ratingCount={user._count.movieRatings}
            watchlistCount={user._count.watchlistItems}
          />
        </Section>
      </div>
    </div>
  )
}

function FavoriteGenres({ genres }: { genres: string[] }) {
  return (
    <div className="mt-6 border-t border-ns-border pt-4">
      <h3 className="font-heading text-sm font-semibold text-ns-text">Favorite Genres</h3>
      <p className="mt-1 text-xs font-body leading-relaxed text-ns-muted">
        The lanes this taste profile returns to most.
      </p>
      <p className="mt-3 text-sm font-body capitalize leading-relaxed text-ns-text">
        {genres.join(' · ')}
      </p>
    </div>
  )
}
