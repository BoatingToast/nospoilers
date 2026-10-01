import Link from 'next/link'
import type { ComponentType } from 'react'
import { InstagramIcon, LinkedInIcon, MailIcon, TikTokIcon, type IconProps } from '@/components/icons'

const CONTACT_EMAIL = 'nospoilers641@gmail.com'
const EMAIL_HREF = `mailto:${CONTACT_EMAIL}?subject=NoSpoilers%20Inquiry`

interface SocialLink {
  href: string
  label: string
  handle: string
  Icon: ComponentType<IconProps>
}

const SOCIAL_LINKS: SocialLink[] = [
  {
    href: 'https://www.tiktok.com/@nospoilers.xyz',
    label: 'TikTok',
    handle: '@nospoilers.xyz',
    Icon: TikTokIcon,
  },
  {
    href: 'https://www.instagram.com/nospoilers.xyz/',
    label: 'Instagram',
    handle: '@nospoilers.xyz',
    Icon: InstagramIcon,
  },
  {
    href: 'https://www.linkedin.com/company/nospoilersxyz',
    label: 'LinkedIn',
    handle: 'nospoilersxyz',
    Icon: LinkedInIcon,
  },
]

const ROW_LINK =
  'flex min-h-12 min-w-0 items-center gap-3 border-t border-ns-border py-2 text-sm text-ns-muted transition-colors hover:text-ns-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ns-secondary-readable'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="min-w-0 border-t border-ns-border bg-ns-bg px-4 sm:px-6">
      <div className="mx-auto grid w-full max-w-6xl gap-8 py-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-10">
        <div className="min-w-0 max-w-xl">
          <Link
            href="/"
            className="font-display text-4xl leading-none tracking-wide text-ns-text transition-colors hover:text-ns-secondary-readable"
          >
            NOSPOILERS
          </Link>
          <p className="mt-3 text-sm leading-6 text-ns-muted">
            Business inquiries, partnerships, or support questions? Send us a note and follow along for spoiler-free movie finds.
          </p>
        </div>

        <div className="min-w-0 border-t-2 border-ns-text">
          <a
            href={EMAIL_HREF}
            aria-label={`Email NoSpoilers at ${CONTACT_EMAIL}`}
            className="flex min-h-12 min-w-0 items-center gap-3 py-2 text-sm text-ns-muted transition-colors hover:text-ns-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ns-secondary-readable"
          >
            <MailIcon size={18} className="flex-shrink-0" />
            <span className="font-heading font-semibold text-ns-text">Email us</span>
            <span className="ml-auto hidden min-w-0 truncate text-xs sm:block">{CONTACT_EMAIL}</span>
          </a>

          {SOCIAL_LINKS.map(({ href, label, handle, Icon }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noreferrer"
              aria-label={`Follow NoSpoilers on ${label}`}
              className={ROW_LINK}
            >
              <Icon size={18} className="flex-shrink-0" />
              <span className="font-heading font-semibold text-ns-text">{label}</span>
              <span className="ml-auto min-w-0 truncate text-xs">{handle}</span>
            </a>
          ))}
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 border-t border-ns-border py-4 text-xs text-ns-muted sm:flex-row sm:items-center sm:justify-between">
        <p>&copy; {year} NoSpoilers. All rights reserved.</p>
        <div className="flex min-w-0 flex-wrap items-center gap-x-4">
          <Link href="/discover" className="inline-flex min-h-10 items-center transition-colors hover:text-ns-text">
            Discover movies
          </Link>
          <Link href="/movie-recommendations" className="inline-flex min-h-10 items-center transition-colors hover:text-ns-text">
            Movie recommendations
          </Link>
          <Link href="/pro" className="inline-flex min-h-10 items-center transition-colors hover:text-ns-text">
            NoSpoilers Pro
          </Link>
          <Link href="/#shield" className="inline-flex min-h-10 items-center transition-colors hover:text-ns-text">
            NoSpoilers Shield
          </Link>
          <Link href="/privacy/extension" className="inline-flex min-h-10 items-center transition-colors hover:text-ns-text">
            Shield privacy
          </Link>
          <a href={EMAIL_HREF} className="inline-flex min-h-10 items-center transition-colors hover:text-ns-text">
            <span className="min-w-0 break-all">Contact: {CONTACT_EMAIL}</span>
          </a>
        </div>
      </div>
    </footer>
  )
}
