import Link from 'next/link'
import type { ComponentType } from 'react'
import Logo from '@/components/ui/Logo'
import { InstagramIcon, LinkedInIcon, MailIcon, TikTokIcon, type IconProps } from '@/components/icons'

const CONTACT_EMAIL = 'nospoilers641@gmail.com'
const EMAIL_HREF = `mailto:${CONTACT_EMAIL}?subject=NoSpoilers%20Inquiry`

interface SocialLink {
  href: string
  label: string
  Icon: ComponentType<IconProps>
}

const SOCIAL_LINKS: SocialLink[] = [
  { href: 'https://www.tiktok.com/@nospoilers.xyz', label: 'TikTok', Icon: TikTokIcon },
  { href: 'https://www.instagram.com/nospoilers.xyz/', label: 'Instagram', Icon: InstagramIcon },
  { href: 'https://www.linkedin.com/company/nospoilersxyz', label: 'LinkedIn', Icon: LinkedInIcon },
]

const PRODUCT_LINKS = [
  { href: '/discover', label: 'Discover movies' },
  { href: '/movie-recommendations', label: 'Movie recommendations' },
  { href: '/pro', label: 'NoSpoilers Pro' },
  { href: '/#shield', label: 'NoSpoilers Shield' },
  { href: '/privacy/extension', label: 'Shield privacy' },
]

const linkClass = 'inline-flex min-h-8 items-center gap-2 text-sm text-ns-muted transition-colors hover:text-ns-text'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-ns-border px-4 sm:px-6">
      <div className="mx-auto grid max-w-[77rem] gap-10 py-12 md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-4 text-sm leading-relaxed text-ns-muted">
            Business inquiries, partnerships, or support questions? Send us a note and follow along for spoiler-free movie finds.
          </p>
          <a href={EMAIL_HREF} aria-label={`Email NoSpoilers at ${CONTACT_EMAIL}`} className={`${linkClass} mt-2 text-ns-text`}>
            <MailIcon size={16} className="flex-shrink-0" />
            {CONTACT_EMAIL}
          </a>
        </div>

        <nav aria-label="Product">
          <h2 className="mb-2 font-heading text-sm font-semibold text-ns-text">Product</h2>
          <ul>
            {PRODUCT_LINKS.map(link => (
              <li key={link.href}>
                <Link href={link.href} className={linkClass}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Social">
          <h2 className="mb-2 font-heading text-sm font-semibold text-ns-text">Follow</h2>
          <ul>
            {SOCIAL_LINKS.map(({ href, label, Icon }) => (
              <li key={href}>
                <a href={href} target="_blank" rel="noreferrer" aria-label={`Follow NoSpoilers on ${label}`} className={linkClass}>
                  <Icon size={16} className="flex-shrink-0" />
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="mx-auto max-w-[77rem] border-t border-ns-border py-4 text-xs text-ns-muted">
        <p>&copy; {year} NoSpoilers. All rights reserved.</p>
      </div>
    </footer>
  )
}
