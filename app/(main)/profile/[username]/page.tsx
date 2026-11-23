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
import Image from 'next/image'
import { tmdbImageUrl } from '@/lib/utils'
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

  const coverPosters = identityMovies.filter(movie => movie.posterPath).slice(0, 3)
  const hasCover = coverPosters.length > 0
  const headerInset = hasCover ? 'px-1 sm:px-6 lg:px-10' : ''
  const favoriteGenres = user.preferences?.genres ?? []
  const movieStats = [
    { label: 'Movies watched', value: watchedCount },
    { label: 'Ratings', value: user._count.movieRatings },
    { label: 'Collections', value: user._count.collections },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-6 sm:px-6 lg:pt-10">

      {/* Identity header: the member's own films are the cover. */}
      <header>
        {hasCover && (
          <div className="relative h-44 overflow-hidden rounded-3xl bg-ns-surface sm:h-64 lg:h-80">
            <div
              className="grid h-full"
              style={{ gridTemplateColumns: `repeat(${coverPosters.length}, minmax(0, 1fr))` }}
            >
              {coverPosters.map((movie, index) => (
                <div key={movie.tmdbId} className="relative h-full overflow-hidden">
                  <Image
                    src={tmdbImageUrl(movie.posterPath, 'w780')}
                    alt=""
                    fill
                    priority={index === 0}
                    sizes="(min-width: 1280px) 420px, 34vw"
                    className="object-cover object-[center_30%]"
                  />
                </div>
              ))}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-ns-bg via-ns-bg/50 to-black/10" />
          </div>
        )}

        <div className={`relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between ${hasCover ? '-mt-16 sm:-mt-20' : ''} ${headerInset}`}>
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
            <Avatar
              src={user.avatarUrl ?? null}
              username={user.username}
              size="xl"
              href={false}
              priority
              className={hasCover ? 'ring-4 ring-ns-bg' : ''}
            />
            <div className="min-w-0 sm:pb-1">
              <h1 className="break-words font-display text-4xl text-ns-text sm:text-5xl lg:text-6xl">
                @{user.username}
              </h1>
              {user.displayName && (
                <p className="mt-1 text-lg font-semibold text-ns-text">{user.displayName}</p>
              )}
              <p className="mt-1 text-sm text-ns-muted">
                Member since {new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(user.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:flex-shrink-0 lg:pb-1">
            {isOwnProfile ? (
              <>
                <Button href="/settings/profile">Edit profile</Button>
                <Button variant="secondary" href="/settings/privacy">
                  <LockIcon size={15} /> Privacy
                </Button>
                <Button variant="secondary" href="/friends">
                  <FriendsIcon size={15} /> Friends
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
                  <RecsIcon size={15} /> Compare taste
                </Button>
              </>
            ) : null}
          </div>
        </div>

        {user.bio && (
          <p className={`mt-6 max-w-2xl whitespace-pre-line break-words text-lg leading-relaxed text-ns-muted ${headerInset}`}>
            {user.bio}
          </p>
        )}

        <div className="mt-8 grid grid-cols-3 gap-x-4 gap-y-5 rounded-2xl bg-ns-surface p-5 sm:p-6 lg:grid-cols-6">
          <SocialStats
            username={user.username}
            followerCount={user._count.followers}
            followingCount={user._count.following}
            friendCount={friendCount}
          />
          {movieStats.map(stat => (
            <div key={stat.label}>
              <p className="font-display text-2xl tabular-nums text-ns-text sm:text-3xl">{stat.value.toLocaleString()}</p>
              <p className="mt-0.5 text-sm text-ns-muted">{stat.label}</p>
            </div>
          ))}
        </div>
      </header>

      {/* Top 5 films. Its editor is a fixed overlay, so this wrapper stays untransformed. */}
      <div className="mt-12 lg:mt-16">
        <ProfileTop5Section userId={user.id} isOwn={isOwnProfile} />
      </div>

      {/* Taste profile */}
      <section className="mt-14 lg:mt-20">
        <div className="ns-reveal mb-6">
          <h2 className="font-display text-3xl text-ns-text sm:text-4xl">
            {isOwnProfile ? 'Your movie identity' : `@${user.username}'s movie identity`}
          </h2>
          <p className="mt-2 max-w-xl text-base leading-relaxed text-ns-muted">
            The personalities, genres, and story traits that shape what {isOwnProfile ? 'you love' : 'they love'} to watch.
          </p>
        </div>

        <div className={`grid grid-cols-1 items-stretch gap-4 lg:gap-6 ${primaryPersonality ? 'lg:grid-cols-12' : ''}`}>
          {primaryPersonality && (
            <div className="ns-reveal lg:col-span-5" style={{ '--i': 1 } as React.CSSProperties}>
              <PersonalityBadge primary={primaryPersonality} secondary={secondaryPersonality} />
            </div>
          )}

          <div className={`ns-reveal ${primaryPersonality ? 'lg:col-span-7' : ''}`} style={{ '--i': 2 } as React.CSSProperties}>
            <TasteCard
              username={user.username}
              personality={primaryPersonality}
              dnaScores={dnaScores}
              topMovies={identityMovies.map(m => m.title)}
            />
          </div>
        </div>

        {favoriteGenres.length > 0 && (
          <div className="ns-reveal mt-4 rounded-2xl bg-ns-surface p-6 lg:mt-6">
            <h3 className="font-heading text-lg font-bold text-ns-text">Favorite genres</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {favoriteGenres.map(genre => (
                <span key={genre} className="rounded-full bg-ns-surface-2 px-3 py-1.5 text-sm font-medium capitalize text-ns-text">
                  {genre}
                </span>
              ))}
            </div>
          </div>
        )}

        {dnaProfile && (
          <div className="ns-reveal mt-4 rounded-3xl bg-ns-surface p-6 sm:p-8 lg:mt-6">
            <MovieDNACard profile={dnaProfile} username={user.username} />
          </div>
        )}

        <div className="mt-10">
          <SpoilerZoneMemberships userId={user.id} />
        </div>
      </section>

      {/* Movie library */}
      <section className="mt-14 lg:mt-20">
        <h2 className="ns-reveal mb-6 font-display text-3xl text-ns-text sm:text-4xl">
          Watched, saved &amp; collected
        </h2>
        <ProfileTabs
          username={user.username}
          ratingCount={user._count.movieRatings}
          watchlistCount={user._count.watchlistItems}
        />
      </section>
    </div>
  )
}
