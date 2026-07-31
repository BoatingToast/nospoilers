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
    href: 'https://www.tiktok.com/@no.spoilers3',
    label: 'TikTok',
    handle: '@no.spoilers3',
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

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-ns-border bg-ns-surface/35 px-4 sm:px-6">
      <div className="mx-auto grid max-w-7xl gap-8 py-10 md:grid-cols-[1fr_1.15fr] md:items-center">
        <div className="max-w-xl">
          <Link
            href="/"
            className="font-display text-2xl tracking-widest text-ns-text transition-colors hover:text-ns-secondary"
          >
            NOSPOILERS
          </Link>
          <p className="mt-3 text-sm leading-6 text-ns-muted">
            Business inquiries, partnerships, or support questions? Send us a note and follow along for spoiler-free movie finds.
          </p>
        </div>

        <div className="flex flex-col gap-3 md:items-end">
          <a
            href={EMAIL_HREF}
            aria-label={`Email NoSpoilers at ${CONTACT_EMAIL}`}
            className="flex w-full items-center justify-between gap-4 rounded-lg border border-ns-secondary/45 bg-ns-secondary px-4 py-3 text-left text-sm font-heading font-semibold text-white transition-colors hover:bg-ns-secondary/85 focus:outline-none focus:ring-2 focus:ring-ns-secondary focus:ring-offset-2 focus:ring-offset-ns-bg md:max-w-md"
          >
            <span className="flex min-w-0 items-center gap-3">
              <MailIcon size={18} className="flex-shrink-0" />
              <span>Email us</span>
            </span>
            <span className="hidden truncate text-xs font-body font-normal text-white/75 sm:block">
              {CONTACT_EMAIL}
            </span>
          </a>

          <div className="grid w-full gap-2 sm:grid-cols-2 md:max-w-md">
            {SOCIAL_LINKS.map(({ href, label, handle, Icon }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={`Follow NoSpoilers on ${label}`}
                className="flex min-w-0 items-center gap-3 rounded-lg border border-ns-border bg-white/[0.03] px-4 py-3 text-sm text-ns-muted transition-colors hover:border-ns-secondary/50 hover:bg-white/[0.06] hover:text-white focus:outline-none focus:ring-2 focus:ring-ns-secondary focus:ring-offset-2 focus:ring-offset-ns-bg"
              >
                <Icon size={18} className="flex-shrink-0" />
                <span className="min-w-0">
                  <span className="block font-heading font-semibold text-ns-text">{label}</span>
                  <span className="block truncate text-xs text-ns-muted">{handle}</span>
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-2 border-t border-ns-border py-4 text-xs text-ns-muted/60 sm:flex-row sm:items-center sm:justify-between">
        <p>&copy; {year} NoSpoilers. All rights reserved.</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link href="/privacy/extension" className="transition-colors hover:text-ns-text">
            Extension privacy
          </Link>
          <a href={EMAIL_HREF} className="transition-colors hover:text-ns-text">
            Contact: {CONTACT_EMAIL}
          </a>
        </div>
      </div>
    </footer>
  )
}
