import type { SafeUser } from '@/types'
import Avatar from '@/components/ui/Avatar'
import PageHeader from '@/components/ui/PageHeader'

interface WelcomeSectionProps {
  user: SafeUser
}

export default function WelcomeSection({ user }: WelcomeSectionProps) {
  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Good morning' :
    hour < 18 ? 'Good afternoon' :
                'Good evening'

  const joinedDate = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(user.createdAt))

  return (
    <PageHeader
      title={user.username.toUpperCase()}
      className="[overflow-wrap:anywhere]"
      lede={
        <div className="flex items-start gap-4">
          <Avatar
            src={user.avatarUrl}
            username={user.username}
            size="lg"
            href={`/profile/${user.username}`}
            priority
          />
          <div className="min-w-0">
            <p>{greeting}</p>
            <p className="mt-1 truncate text-sm text-ns-muted">{user.email}</p>
            <p className="text-sm text-ns-muted">Member since {joinedDate}</p>
          </div>
        </div>
      }
    />
  )
}
