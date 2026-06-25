import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getPersonalityBySlug } from '@/services/personality'
import ProfileDNA from '@/components/profile/ProfileDNA'
import PersonalityBadge from '@/components/profile/PersonalityBadge'
import TasteCard from '@/components/profile/TasteCard'
import ProfileTabs from '@/components/profile/ProfileTabs'
import FollowButton              from '@/components/social/FollowButton'
import SocialStats               from '@/components/social/SocialStats'
import ProfileTop5Section        from '@/components/top-five/ProfileTop5Section'
import SpoilerZoneMemberships   from '@/components/profile/SpoilerZoneMemberships'
import { LockIcon, FriendsIcon, RecsIcon } from '@/components/icons'
import Avatar from '@/components/ui/Avatar'
import Link from 'next/link'
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

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="border-b border-ns-border pb-8 pt-2">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-5">
              {/* Avatar */}
              <div className="flex-shrink-0 mt-1">
                <Avatar
                  src={user.avatarUrl ?? null}
                  username={user.username}
                  size="lg"
                  href={false}
                />
              </div>

              <div>
                <p className="text-ns-muted text-xs tracking-widest uppercase font-body mb-2">Profile</p>
                <h1 className="font-display text-5xl sm:text-6xl tracking-wider text-ns-text mb-1">
                  @{user.username.toUpperCase()}
                </h1>
                {user.displayName && (
                  <p className="text-ns-muted text-sm font-body mb-1">{user.displayName}</p>
                )}
                {user.bio && (
                  <p className="text-ns-muted/70 text-sm font-body mb-1 max-w-md">{user.bio}</p>
                )}
                <p className="text-ns-muted/50 text-xs font-body">
                  Member since {new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(user.createdAt)}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {isOwnProfile ? (
                <>
                  <Link
                    href="/settings/profile"
                    className="px-4 py-2 rounded-xl text-sm font-body border border-ns-border text-ns-muted hover:text-ns-text transition-colors"
                  >
                    Edit Profile
                  </Link>
                  <Link
                    href="/settings/privacy"
                    className="px-4 py-2 rounded-xl text-sm font-body border border-ns-border text-ns-muted hover:text-ns-text transition-colors flex items-center gap-1.5"
                  >
                    <LockIcon size={14} /> Privacy
                  </Link>
                  <Link
                    href="/friends"
                    className="px-4 py-2 rounded-xl text-sm font-body border border-ns-border text-ns-muted hover:text-ns-text transition-colors flex items-center gap-1.5"
                  >
                    <FriendsIcon size={14} /> Friends
                  </Link>
                </>
              ) : session ? (
                <>
                  <FollowButton
                    username={user.username}
                    initialIsFollowing={isFollowing}
                    initialIsFriend={isFriend}
                    sessionUserId={session.user.id}
                  />
                  <Link
                    href={`/compatibility/${user.username}`}
                    className="px-4 py-2 rounded-xl text-sm font-body border border-ns-gold/30 text-ns-gold hover:border-ns-gold/60 transition-colors flex items-center gap-1.5"
                  >
                    <RecsIcon size={14} /> Compare Taste
                  </Link>
                </>
              ) : null}
            </div>
          </div>

          {/* Social stats (clickable) */}
          <div className="mt-6">
            <SocialStats
              username={user.username}
              followerCount={user._count.followers}
              followingCount={user._count.following}
              friendCount={friendCount}
            />
          </div>

          {/* Movie stats */}
          <div className="flex flex-wrap gap-6 mt-4">
            {[
              { label: 'Movies Watched', value: watchedCount },
              { label: 'Ratings',        value: user._count.movieRatings },
              { label: 'Collections',    value: user._count.collections },
            ].map(s => (
              <div key={s.label}>
                <p className="font-display text-3xl tracking-wider text-ns-gold">{s.value}</p>
                <p className="text-ns-muted text-xs font-body mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Top 5 Films ─────────────────────────────────────────────────── */}
        <div className="mt-10 mb-2">
          <ProfileTop5Section userId={user.id} isOwn={isOwnProfile} />
        </div>

        {/* ── Main layout ─────────────────────────────────────────────────── */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left — taste passport */}
          <div className="lg:col-span-1 flex flex-col gap-6">

            {primaryPersonality && (
              <PersonalityBadge primary={primaryPersonality} secondary={secondaryPersonality} />
            )}

            <TasteCard
              username={user.username}
              personality={primaryPersonality}
              dnaScores={dnaScores}
              topMovies={user.onboardingMovies.slice(0, 3).map(m => m.title)}
            />

            {(user.preferences?.genres ?? []).length > 0 && (
              <div className="bg-ns-surface border border-ns-border rounded-2xl p-5">
                <p className="text-ns-muted text-[10px] tracking-widest uppercase font-body mb-3">Favorite Genres</p>
                <div className="flex flex-wrap gap-2">
                  {(user.preferences?.genres ?? []).map(genre => (
                    <span key={genre} className="px-3 py-1 rounded-full border border-ns-border text-ns-muted text-xs font-body capitalize">
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {dnaScores && <ProfileDNA scores={dnaScores} username={user.username} />}

            <SpoilerZoneMemberships userId={user.id} />
          </div>

          {/* Right — tabbed content */}
          <div className="lg:col-span-2">
            <ProfileTabs
              username={user.username}
              ratingCount={user._count.movieRatings}
              watchlistCount={user._count.watchlistItems}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
