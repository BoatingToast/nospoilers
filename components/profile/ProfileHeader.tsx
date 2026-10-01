import Button from '@/components/ui/Button'
import PageHeader from '@/components/ui/PageHeader'
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
    <PageHeader
      title={`@${user.username.toUpperCase()}`}
      className="[&_h1]:[overflow-wrap:anywhere]"
      lede={<p className="text-sm text-ns-muted">Member since {joined}</p>}
    >
      <div className="w-full min-w-0">
        {/* Stats row */}
        <dl className="grid grid-cols-3 gap-4 border-t border-ns-border pt-4">
          <div>
            <dd className="font-display text-3xl leading-none tracking-wide text-ns-secondary-readable">{followerCount}</dd>
            <dt className="text-ns-muted text-xs font-body mt-1">Followers</dt>
          </div>
          <div>
            <dd className="font-display text-3xl leading-none tracking-wide text-ns-text">{followingCount}</dd>
            <dt className="text-ns-muted text-xs font-body mt-1">Following</dt>
          </div>
          <div>
            <dd className="font-display text-3xl leading-none tracking-wide text-ns-text">{recommendationCount}</dd>
            <dt className="text-ns-muted text-xs font-body mt-1">Picks</dt>
          </div>
        </dl>

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-ns-border pt-4">
          {isOwnProfile ? (
            <Button variant="secondary" href="/dashboard">
              Edit Profile
            </Button>
          ) : (
            <FollowButton
              username={user.username}
              initialState={isFollowing}
              sessionUserId={sessionUserId}
            />
          )}
        </div>
      </div>
    </PageHeader>
  )
}
