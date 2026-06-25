import type { SafeUser } from '@/types'

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
    <div className="border-b border-ns-border pb-8 mb-8">
      <p className="text-ns-muted text-sm tracking-widest uppercase font-body mb-2">
        {greeting}
      </p>
      <h1 className="font-display text-5xl sm:text-6xl tracking-wider text-ns-text mb-4">
        {user.username.toUpperCase()}
      </h1>
      <div className="flex flex-wrap gap-6 text-sm font-body text-ns-muted">
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-ns-gold" />
          {user.email}
        </span>
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-ns-muted/40" />
          Member since {joinedDate}
        </span>
      </div>
    </div>
  )
}
