'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Logo from '@/components/ui/Logo'
import SearchModal from '@/components/ui/SearchModal'
import NotificationBell from '@/components/social/NotificationBell'
import {
  AchievementsIcon,
  ArrowRightIcon,
  ClapperboardIcon,
  CloseIcon,
  EyeIcon,
  FriendsIcon,
  LockIcon,
  PersonIcon,
  RatingsIcon,
  SettingsIcon,
  WatchlistIcon,
  type IconProps,
} from '@/components/icons'

// ─── Navigation model ────────────────────────────────────────────────────────

interface NavLink {
  href: string
  label: string
  authRequired: boolean
  signedOutOnly?: boolean
}

const NAV_LINKS: NavLink[] = [
  { href: '/dashboard', label: 'Dashboard',   authRequired: true },
  { href: '/discover', label: 'Discover',    authRequired: false },
  { href: '/my-recommendations', label: 'For You',     authRequired: true },
  { href: '/#shield', label: 'Shield',      authRequired: false, signedOutOnly: true },
  { href: '/collections', label: 'Collections', authRequired: false },
  { href: '/movie-night', label: 'Movie Night', authRequired: true },
  { href: '/pro', label: 'Pro',         authRequired: false },
]

interface MenuItem {
  href: string
  label: string
  Icon: React.ComponentType<IconProps>
}

const MENU_GROUPS: { label: string; items: MenuItem[] }[] = [
  {
    label: 'Library',
    items: [
      { href: '/watchlist', label: 'Watchlist',     Icon: WatchlistIcon },
      { href: '/ratings', label: 'Ratings',       Icon: RatingsIcon },
      { href: '/plot-passport', label: 'Plot Passport', Icon: LockIcon },
      { href: '/where-was-i', label: 'Where Was I?',  Icon: EyeIcon },
    ],
  },
  {
    label: 'Community',
    items: [
      { href: '/friends', label: 'Friends',          Icon: FriendsIcon },
      { href: '/achievements', label: 'Achievements',     Icon: AchievementsIcon },
      { href: '/theater', label: 'Theater · Pro',    Icon: ClapperboardIcon },
      { href: '/creator', label: 'Filmmaker Studio', Icon: ClapperboardIcon },
    ],
  },
  {
    label: 'Account',
    items: [
      { href: '/settings/profile', label: 'Edit Profile',     Icon: PersonIcon },
      { href: '/settings/data', label: 'Import & Export',  Icon: SettingsIcon },
      { href: '/settings/privacy', label: 'Privacy Settings', Icon: LockIcon },
    ],
  },
]

function isActive(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

// ─── Profile menu ────────────────────────────────────────────────────────────

function ProfileDropdown({ username, avatarUrl }: { username: string; avatarUrl: string | null }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  useEffect(() => { setOpen(false) }, [pathname])

  useEffect(() => {
    if (!open) return
    function handler(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (!open) return
    const focusFrame = window.requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
    })
    return () => window.cancelAnimationFrame(focusFrame)
  }, [open])

  function closeMenu(restoreFocus = false) {
    setOpen(false)
    if (restoreFocus) buttonRef.current?.focus()
  }

  function handleMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeMenu(true)
      return
    }

    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
    if (items.length === 0) return

    const currentIndex = items.indexOf(document.activeElement as HTMLElement)
    if (event.key === 'Home') items[0].focus()
    else if (event.key === 'End') items[items.length - 1].focus()
    else if (event.key === 'ArrowDown') items[(currentIndex + 1) % items.length].focus()
    else items[(currentIndex - 1 + items.length) % items.length].focus()
  }

  return (
    <div ref={ref} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="profile-menu"
        aria-label="Profile menu"
        onKeyDown={event => {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setOpen(true)
          }
        }}
        className="flex h-10 items-center gap-1.5 rounded-full px-1.5 transition-colors hover:bg-ns-text/5"
      >
        <Avatar src={avatarUrl} username={username} size="xs" />
        <svg
          aria-hidden="true"
          className={`hidden h-3.5 w-3.5 text-ns-muted transition-transform duration-150 lg:block ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          ref={menuRef}
          id="profile-menu"
          role="menu"
          aria-label="Profile menu"
          onKeyDown={handleMenuKeyDown}
          className="ns-pop-in absolute right-0 top-full mt-2 max-h-[calc(100dvh-7rem)] w-64 origin-top-right overflow-y-auto rounded-xl border border-ns-border bg-ns-surface-2 p-1.5 shadow-2xl"
        >
          <Link
            href={`/profile/${username}`}
            role="menuitem"
            onClick={() => closeMenu()}
            className="block rounded-lg px-3 py-2.5 transition-colors hover:bg-ns-surface-3"
          >
            <span className="block truncate text-sm font-semibold text-ns-text">@{username}</span>
            <span className="block text-xs text-ns-muted">View profile</span>
          </Link>

          {MENU_GROUPS.map(group => (
            <div key={group.label} role="group" aria-label={group.label} className="border-t border-ns-border py-1">
              <p aria-hidden="true" className="px-3 py-1 text-xs font-medium text-ns-subtle">{group.label}</p>
              {group.items.map(({ href, label, Icon }) => (
                <Link
                  key={href}
                  href={href}
                  role="menuitem"
                  onClick={() => closeMenu()}
                  className="flex min-h-10 items-center gap-2.5 rounded-lg px-3 text-sm font-medium text-ns-text transition-colors hover:bg-ns-surface-3"
                >
                  <Icon size={15} className="flex-shrink-0 text-ns-muted" />
                  {label}
                </Link>
              ))}
            </div>
          ))}

          <button
            type="button"
            role="menuitem"
            onClick={() => signOut({ callbackUrl: '/' })}
            className="flex min-h-10 w-full items-center gap-2.5 rounded-lg border-t border-ns-border px-3 text-sm font-medium text-ns-text transition-colors hover:bg-ns-surface-3"
          >
            <ArrowRightIcon size={15} className="flex-shrink-0 text-ns-muted" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Header ──────────────────────────────────────────────────────────────────

export default function Navbar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [tucked, setTucked] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)
  const mobileTriggerRef = useRef<HTMLButtonElement>(null)
  const mobileCloseRef = useRef<HTMLButtonElement>(null)

  const username = session?.user?.name ?? ''
  const avatarUrl = session?.user?.image ?? null

  useEffect(() => { setMobileOpen(false) }, [pathname])

  useEffect(() => {
    let lastY = window.scrollY
    const update = () => {
      const y = window.scrollY
      setScrolled(y > 8)
      if (Math.abs(y - lastY) < 6) return
      // Get out of the way while reading, come back on any upward scroll.
      setTucked(y > lastY && y > 240)
      lastY = y
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])

  useEffect(() => {
    if (!mobileOpen) return

    const previousOverflow = document.body.style.overflow
    const mobileTrigger = mobileTriggerRef.current
    document.body.style.overflow = 'hidden'
    const focusFrame = window.requestAnimationFrame(() => mobileCloseRef.current?.focus())

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setMobileOpen(false)
        return
      }

      if (event.key !== 'Tab' || !drawerRef.current) return
      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter(element => !element.hidden && element.getAttribute('aria-hidden') !== 'true')
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.cancelAnimationFrame(focusFrame)
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      mobileTrigger?.focus()
    }
  }, [mobileOpen])

  const visibleLinks = NAV_LINKS.filter(link => (
    (!link.authRequired || session) && (!link.signedOutOnly || !session)
  ))
  const overHero = pathname === '/' && !scrolled

  return (
    <>
      <header
        onFocusCapture={() => setTucked(false)}
        className={`fixed left-0 right-0 top-8 z-50 border-b transition-[transform,background-color,border-color] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${
          overHero ? 'border-transparent bg-transparent' : 'border-ns-border bg-ns-bg'
        } ${tucked && !mobileOpen ? '-translate-y-full' : ''}`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
          <Logo />

          <nav className="hidden min-w-0 flex-1 items-center gap-0.5 lg:flex" aria-label="Main navigation">
            {visibleLinks.map(link => {
              const active = isActive(link.href, pathname)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={[
                    'flex h-10 items-center whitespace-nowrap rounded-full px-3.5 text-sm font-semibold text-ns-text transition-colors duration-150',
                    active ? 'bg-ns-text/10' : 'hover:bg-ns-text/5',
                  ].join(' ')}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>

          <div className="ml-auto flex flex-shrink-0 items-center gap-1 sm:gap-2">
            <SearchModal compact />

            {session && <NotificationBell />}

            {session ? (
              <ProfileDropdown username={username} avatarUrl={avatarUrl} />
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <Button variant="ghost" size="sm" href="/login">Log In</Button>
                <Button variant="primary" size="sm" href="/register">Sign Up</Button>
              </div>
            )}

            <button
              ref={mobileTriggerRef}
              type="button"
              onClick={() => setMobileOpen(value => !value)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              aria-haspopup="dialog"
              aria-controls="mobile-navigation"
              className="flex h-11 w-11 items-center justify-center rounded-full text-ns-text transition-colors hover:bg-ns-text/5 lg:hidden"
            >
              <svg aria-hidden="true" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <>
          <div
            className="ns-backdrop-in fixed inset-0 z-[70] bg-black/70 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />

          <div
            ref={drawerRef}
            id="mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation menu"
            className="ns-drawer-in fixed bottom-0 right-0 top-0 z-[80] flex w-80 max-w-[88vw] flex-col rounded-l-2xl bg-ns-surface shadow-2xl lg:hidden"
          >
            <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-ns-border px-4">
              <Logo />
              <button
                ref={mobileCloseRef}
                type="button"
                onClick={() => setMobileOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-ns-surface-2 text-ns-text transition-colors hover:bg-ns-surface-3"
                aria-label="Close menu"
              >
                <CloseIcon size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain">
              <div className="border-b border-ns-border p-3">
                <SearchModal enableShortcut={false} />
              </div>

              <nav className="border-b border-ns-border p-2" aria-label="Explore">
                {visibleLinks.map(link => {
                  const active = isActive(link.href, pathname)
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      aria-current={active ? 'page' : undefined}
                      className={[
                        'flex min-h-11 items-center rounded-xl px-3 text-base font-semibold text-ns-text transition-colors',
                        active ? 'bg-ns-surface-3' : 'hover:bg-ns-surface-3',
                      ].join(' ')}
                    >
                      {link.label}
                    </Link>
                  )
                })}
              </nav>

              {session && MENU_GROUPS.map(group => (
                <nav key={group.label} className="border-b border-ns-border p-2" aria-label={group.label}>
                  <p className="px-3 py-1.5 text-xs font-medium text-ns-subtle">{group.label}</p>
                  {group.items.map(({ href, label, Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-ns-text transition-colors hover:bg-ns-surface-3"
                    >
                      <Icon size={16} className="flex-shrink-0 text-ns-muted" />
                      {label}
                    </Link>
                  ))}
                </nav>
              ))}
            </div>

            <div className="flex-shrink-0 border-t border-ns-border p-3">
              {session ? (
                <div className="flex items-center justify-between gap-3">
                  <Link href={`/profile/${username}`} className="flex min-h-11 min-w-0 items-center gap-2.5">
                    <Avatar src={avatarUrl} username={username} size="sm" />
                    <span className="truncate text-sm font-medium text-ns-text">@{username}</span>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: '/' })}>
                    Sign Out
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="secondary" href="/login">Log In</Button>
                  <Button variant="primary" href="/register">Sign Up</Button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
