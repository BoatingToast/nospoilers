import Link from 'next/link'

export type SocialHubSection = 'friends' | 'followers' | 'following' | 'discover'

const items = [
  { key: 'friends', label: 'Friends', href: '/friends' },
  { key: 'followers', label: 'Followers', href: '/friends/followers' },
  { key: 'following', label: 'Following', href: '/friends/following' },
  { key: 'discover', label: 'Find people', href: '/friends/find' },
] as const

export default function SocialHubNav({ active }: { active: SocialHubSection }) {
  return (
    <nav aria-label="Friends and connections" className="mb-8 min-w-0 border-b border-ns-border">
      <div className="flex flex-wrap gap-x-6">
        {items.map(({ key, label, href }) => {
          const isActive = key === active
          return (
            <Link
              key={key}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className={`-mb-px inline-flex min-h-[44px] items-center whitespace-nowrap border-b-2 font-heading text-sm font-semibold transition-colors ${
                isActive
                  ? 'border-ns-text text-ns-text'
                  : 'border-transparent text-ns-muted hover:text-ns-text'
              }`}
            >
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
