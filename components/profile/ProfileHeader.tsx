import Button from '@/components/ui/Button'
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

  const stats = [
    { label: 'Followers', value: followerCount },
    { label: 'Following', value: followingCount },
    { label: 'Picks', value: recommendationCount },
  ]

  return (
    <header className="border-b border-ns-border pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="break-words font-display text-4xl text-ns-text sm:text-5xl">@{user.username}</h1>
          <p className="mt-2 text-base text-ns-muted">Member since {joined}</p>
        </div>
        {isOwnProfile ? (
          <Button variant="outline" href="/dashboard">Edit profile</Button>
        ) : (
          <FollowButton username={user.username} initialState={isFollowing} sessionUserId={sessionUserId} />
        )}
      </div>

      <dl className="mt-6 flex gap-8">
        {stats.map(stat => (
          <div key={stat.label}>
            <dd className="font-display text-3xl tabular-nums text-ns-text">{stat.value}</dd>
            <dt className="mt-0.5 text-sm text-ns-muted">{stat.label}</dt>
          </div>
        ))}
      </dl>
    </header>
  )
}
