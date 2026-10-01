import Link from 'next/link'
import { FriendsIcon, PersonIcon, SearchIcon } from '@/components/icons'

export type SocialHubSection = 'friends' | 'followers' | 'following' | 'discover'

const items = [
  { key: 'friends', label: 'Friends', href: '/friends', Icon: FriendsIcon },
  { key: 'followers', label: 'Followers', href: '/friends/followers', Icon: PersonIcon },
  { key: 'following', label: 'Following', href: '/friends/following', Icon: PersonIcon },
  { key: 'discover', label: 'Find people', href: '/friends/find', Icon: SearchIcon },
] as const

export default function SocialHubNav({ active }: { active: SocialHubSection }) {
  return (
    <nav aria-label="Friends and connections" className="mb-8 overflow-x-auto scrollbar-hide">
      <div className="flex w-max min-w-full gap-1 rounded-2xl border border-ns-border/60 bg-ns-surface p-1">
        {items.map(({ key, label, href, Icon }) => {
          const isActive = key === active
          return (
            <Link
              key={key}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className={`inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-body font-semibold transition-all sm:text-sm ${
                isActive
                  ? 'bg-ns-secondary text-ns-secondary-foreground'
                  : 'text-ns-muted/70 hover:bg-white/5 hover:text-ns-text'
              }`}
            >
              <Icon size={14} />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
