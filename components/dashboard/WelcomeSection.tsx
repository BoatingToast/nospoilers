import type { SafeUser } from '@/types'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'

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
    <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <Avatar
          src={user.avatarUrl}
          username={user.username}
          size="md"
          href={`/profile/${user.username}`}
          priority
        />
        <div className="min-w-0">
          <h1 className="font-display text-3xl text-ns-text [overflow-wrap:anywhere] sm:text-5xl">
            {greeting}, {user.username}.
          </h1>
          <p className="mt-1 text-base text-ns-muted">Member since {joinedDate}</p>
        </div>
      </div>
      <Button variant="secondary" href="/discover" className="flex-shrink-0 self-start sm:self-auto">
        Discover movies
      </Button>
    </header>
  )
}
