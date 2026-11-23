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
    <nav aria-label="Friends and connections" className="-mx-4 overflow-x-auto px-4 scrollbar-hide sm:mx-0 sm:px-0">
      <div className="flex w-max gap-1">
        {items.map(({ key, label, href }) => {
          const isActive = key === active
          return (
            <Link
              key={key}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-colors duration-150 sm:min-h-10 ${
                isActive
                  ? 'bg-ns-text text-ns-bg'
                  : 'text-ns-muted hover:bg-ns-surface-2 hover:text-ns-text'
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
