import type { SafeUser } from '@/types'
import Avatar from '@/components/ui/Avatar'

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
    <div className="flex items-start gap-4 border-b border-ns-border pb-6 sm:gap-5">
      <Avatar
        src={user.avatarUrl}
        username={user.username}
        size="lg"
        href={`/profile/${user.username}`}
        priority
        className="ring-2 ring-ns-border/50"
      />
      <div className="min-w-0 pt-1">
        <p className="text-ns-muted text-sm tracking-widest uppercase font-body mb-2">
          {greeting}
        </p>
        <h1 className="mb-3 break-words font-display text-4xl tracking-wider text-ns-text sm:text-5xl">
          {user.username.toUpperCase()}
        </h1>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-body text-ns-muted">
          <span className="flex items-center gap-2 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-ns-secondary flex-shrink-0" />
            <span className="truncate">{user.email}</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-ns-muted/40" />
            Member since {joinedDate}
          </span>
        </div>
      </div>
    </div>
  )
}
