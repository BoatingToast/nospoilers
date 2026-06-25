import Link from 'next/link'
import FollowButton from './FollowButton'

interface Props {
  user:               { id: string; username: string; createdAt: string }
  followerCount:      number
  followingCount:     number
  recommendationCount: number
  isOwnProfile:       boolean
  isFollowing:        boolean
  sessionUserId:      string | null
}

export default function ProfileHeader({
  user, followerCount, followingCount, recommendationCount, isOwnProfile, isFollowing, sessionUserId,
}: Props) {
  const joined = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(user.createdAt))

  return (
    <div className="border-b border-ns-border pb-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-ns-muted text-xs tracking-widest uppercase font-body mb-2">Profile</p>
          <h1 className="font-display text-5xl sm:text-6xl tracking-wider text-ns-text mb-3">
            @{user.username.toUpperCase()}
          </h1>
          <p className="text-ns-muted text-sm font-body">Member since {joined}</p>
        </div>

        <div className="flex items-center gap-3 mt-2">
          {isOwnProfile ? (
            <Link
              href="/dashboard"
              className="px-5 py-2 rounded-xl text-sm font-body border border-ns-border text-ns-muted hover:text-ns-text hover:border-ns-muted/40 transition-colors"
            >
              Edit Profile
            </Link>
          ) : (
            <FollowButton
              username={user.username}
              initialState={isFollowing}
              sessionUserId={sessionUserId}
            />
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-8 mt-6">
        <div className="text-center">
          <p className="font-display text-3xl tracking-wider text-ns-gold">{followerCount}</p>
          <p className="text-ns-muted text-xs font-body mt-0.5">Followers</p>
        </div>
        <div className="text-center">
          <p className="font-display text-3xl tracking-wider text-ns-text">{followingCount}</p>
          <p className="text-ns-muted text-xs font-body mt-0.5">Following</p>
        </div>
        <div className="text-center">
          <p className="font-display text-3xl tracking-wider text-ns-text">{recommendationCount}</p>
          <p className="text-ns-muted text-xs font-body mt-0.5">Picks</p>
        </div>
      </div>
    </div>
  )
}
