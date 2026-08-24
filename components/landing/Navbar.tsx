'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import Button from '@/components/ui/Button'
import SearchModal from '@/components/ui/SearchModal'
import Avatar from '@/components/ui/Avatar'
import NotificationBell from '@/components/social/NotificationBell'
import {
  RecsIcon,
  DashboardIcon,
  WatchlistIcon,
  RatingsIcon,
  FriendsIcon,
  AchievementsIcon,
  ClapperboardIcon,
  LockIcon,
  SettingsIcon,
  CloseIcon,
  ArrowRightIcon,
  type IconProps,
} from '@/components/icons'

// ─── Primary nav ─────────────────────────────────────────────────────────────

interface NavLink {
  href:         string
  label:        string
  authRequired: boolean
  signedOutOnly?: boolean
  highlight?:   boolean
}

const NAV_LINKS: NavLink[] = [
  { href: '/dashboard',          label: 'Dashboard',   authRequired: true  },
  { href: '/discover',           label: 'Discover',    authRequired: false },
  { href: '/#shield',            label: 'Shield',      authRequired: false, signedOutOnly: true },
  { href: '/collections',        label: 'Collections', authRequired: false },
  { href: '/my-recommendations', label: 'Recs',        authRequired: true, highlight: true },
  { href: '/movie-night',        label: 'Movie Night', authRequired: true  },
  { href: '/pro',                label: 'Pro',          authRequired: false },
]

// ─── Profile dropdown items ───────────────────────────────────────────────────

interface DropdownItem {
  href:  string
  label: string
  Icon:  React.ComponentType<IconProps>
}

const DROPDOWN_ITEMS: DropdownItem[] = [
  { href: '/dashboard',         label: 'Dashboard',        Icon: DashboardIcon    },
  { href: '/movie-night',       label: 'Movie Night',      Icon: ClapperboardIcon },
  { href: '/plot-passport',     label: 'Plot Passport',    Icon: LockIcon         },
  { href: '/watchlist',         label: 'Watchlist',        Icon: WatchlistIcon    },
  { href: '/ratings',           label: 'Ratings',          Icon: RatingsIcon      },
  { href: '/friends',           label: 'Friends',          Icon: FriendsIcon      },
  { href: '/achievements',      label: 'Achievements',     Icon: AchievementsIcon },
  { href: '/settings/profile',  label: 'Edit Profile',     Icon: LockIcon         },
  { href: '/settings/data',     label: 'Import & Export',  Icon: SettingsIcon     },
  { href: '/settings/privacy',  label: 'Privacy Settings', Icon: LockIcon         },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Profile dropdown ─────────────────────────────────────────────────────────

function ProfileDropdown({ username, avatarUrl }: { username: string; avatarUrl: string | null }) {
  const [open,    setOpen]    = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  useEffect(() => { setOpen(false) }, [pathname])

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
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
        onClick={() => setOpen(v => !v)}
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
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors group"
      >
        <Avatar src={avatarUrl} username={username} size="xs" />
        <span className="hidden lg:block text-xs font-body text-ns-muted group-hover:text-ns-text transition-colors max-w-[80px] truncate">
          {username}
        </span>
        <svg
          className={`hidden lg:block w-3 h-3 text-ns-muted transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && <div
        ref={menuRef}
        id="profile-menu"
        role="menu"
        aria-label="Profile menu"
        onKeyDown={handleMenuKeyDown}
        className="absolute right-0 top-full mt-2 w-52 bg-ns-surface border border-ns-border rounded-2xl shadow-2xl overflow-hidden animate-fade-in"
      >
        {/* User info header */}
        <div className="px-4 py-3 border-b border-ns-border">
          <p className="text-sm font-body text-white font-medium">@{username}</p>
          <Link
            href={`/profile/${username}`}
            role="menuitem"
            className="text-[11px] font-body text-ns-secondary-readable hover:text-white transition-colors"
            onClick={() => closeMenu()}
          >
            View Profile →
          </Link>
        </div>

        {/* Nav items */}
        <div className="py-1.5">
          {DROPDOWN_ITEMS.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              role="menuitem"
              onClick={() => closeMenu()}
              className="flex items-center gap-3 px-4 py-2 text-sm font-body text-ns-muted hover:text-white hover:bg-white/5 transition-colors"
            >
              <Icon size={15} className="flex-shrink-0 opacity-70" />
              {label}
            </Link>
          ))}
        </div>

        {/* Sign out */}
        <div className="border-t border-ns-border py-1.5">
          <button
            type="button"
            role="menuitem"
            onClick={() => signOut({ callbackUrl: '/' })}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm font-body text-ns-muted hover:text-rose-400 hover:bg-white/5 transition-colors"
          >
            <ArrowRightIcon size={15} className="flex-shrink-0 opacity-70" />
            Sign Out
          </button>
        </div>
      </div>}
    </div>
  )
}

// ─── Main Navbar ──────────────────────────────────────────────────────────────

export default function Navbar() {
  const { data: session } = useSession()
  const pathname           = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)
  const mobileTriggerRef = useRef<HTMLButtonElement>(null)
  const mobileCloseRef = useRef<HTMLButtonElement>(null)

  const username  = session?.user?.name ?? ''
  const avatarUrl = session?.user?.image ?? null

  useEffect(() => { setMobileOpen(false) }, [pathname])

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

  return (
    <>
      <header className="fixed top-8 left-0 right-0 z-50 bg-ns-bg/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">

          {/* Logo */}
          <Link
            href={session ? '/dashboard' : '/'}
            className="font-display text-xl sm:text-2xl tracking-widest text-ns-text hover:text-ns-secondary-readable transition-colors flex-shrink-0"
          >
            NOSPOILERS
          </Link>

          {/* Desktop nav — shares space with logo and right controls so it can't overlap them */}
          <nav
            className="hidden md:flex items-center gap-4 xl:gap-8 flex-1 min-w-0 justify-center"
            aria-label="Main navigation"
          >
            {visibleLinks.map(link => {
              const active = isActive(link.href, pathname)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={[
                    'relative text-[13px] font-heading font-medium tracking-[0.04em]',
                    'transition-colors duration-200 group whitespace-nowrap flex items-center gap-1.5',
                    link.highlight
                      ? active
                        ? 'text-amber-300'
                        : 'text-ns-secondary-readable hover:text-amber-300'
                      : active
                        ? 'text-ns-secondary-readable'
                        : 'text-white/50 hover:text-white/90',
                  ].join(' ')}
                >
                  {link.highlight && <RecsIcon size={13} className="flex-shrink-0" />}
                  {link.label}
                  {/* Sliding underline indicator */}
                  <span
                    className={[
                      'absolute -bottom-[1px] left-0 right-0 h-[2px] rounded-full',
                      'transition-all duration-300 origin-left',
                      link.highlight
                        ? active
                          ? 'bg-amber-300 scale-x-100'
                          : 'bg-ns-secondary-readable scale-x-0 group-hover:scale-x-100'
                        : active
                          ? 'bg-ns-secondary-readable scale-x-100'
                          : 'bg-white/25 scale-x-0 group-hover:scale-x-100',
                    ].join(' ')}
                  />
                </Link>
              )
            })}
          </nav>

          {/* Right — search + profile dropdown / auth */}
          <div className="ml-auto flex flex-shrink-0 items-center gap-2 sm:gap-3">

            {/* Search */}
            <div className="hidden md:block">
              <SearchModal />
            </div>

            {session && <NotificationBell />}

            {session ? (
              <ProfileDropdown username={username} avatarUrl={avatarUrl} />
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Button variant="ghost"   size="sm" href="/login">Log In</Button>
                <Button variant="primary" size="sm" href="/register">Sign Up</Button>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              ref={mobileTriggerRef}
              type="button"
              onClick={() => setMobileOpen(v => !v)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              aria-haspopup="dialog"
              aria-controls="mobile-navigation"
              className="md:hidden flex flex-col gap-[5px] items-center justify-center w-9 h-9 rounded-lg hover:bg-white/5 transition-colors"
            >
              <span className={`block w-5 h-0.5 bg-ns-text transition-all duration-200 ${mobileOpen ? 'translate-y-[7px] rotate-45'  : ''}`} />
              <span className={`block w-5 h-0.5 bg-ns-text transition-all duration-200 ${mobileOpen ? 'opacity-0'                     : ''}`} />
              <span className={`block w-5 h-0.5 bg-ns-text transition-all duration-200 ${mobileOpen ? '-translate-y-[7px] -rotate-45' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile drawer ────────────────────────────────────────────────────── */}
      {mobileOpen && <>
      <div
        className={`fixed inset-0 z-40 bg-black/60 md:hidden transition-opacity duration-200 ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      <div
        ref={drawerRef}
        id="mobile-navigation"
        role="dialog"
        aria-modal="true"
        className={`fixed top-8 right-0 bottom-0 z-50 w-72 max-w-[85vw] bg-ns-surface border-l border-ns-border
                    flex flex-col md:hidden transition-transform duration-300 ease-in-out
                    ${mobileOpen ? 'translate-x-0' : 'translate-x-full'}`}
        aria-label="Mobile navigation menu"
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-ns-border">
          <span className="font-display text-lg tracking-widest text-ns-text">NOSPOILERS</span>
          <button
            ref={mobileCloseRef}
            type="button"
            onClick={() => setMobileOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-ns-muted hover:text-white transition-colors"
            aria-label="Close menu"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-ns-border">
          <SearchModal />
        </div>

        {/* Primary nav links */}
        <nav className="px-3 py-3 border-b border-ns-border space-y-1">
          <p className="text-[10px] font-body text-ns-muted uppercase tracking-widest px-2 pb-1">Explore</p>
          {visibleLinks.map(link => {
            const active = isActive(link.href, pathname)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={[
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-heading font-medium transition-all',
                  link.highlight
                    ? active ? 'text-amber-300 bg-ns-secondary/15' : 'text-ns-secondary-readable hover:text-amber-300 hover:bg-ns-secondary/10'
                    : active ? 'text-ns-secondary-readable bg-ns-secondary/8' : 'text-white/60 hover:text-white hover:bg-white/5',
                ].join(' ')}
              >
                {link.highlight && <RecsIcon size={14} />}
                {link.label}
              </Link>
            )
          })}
        </nav>

        {/* Personal links */}
        {session && (
          <nav className="px-3 py-3 border-b border-ns-border space-y-1 overflow-y-auto">
            <p className="text-[10px] font-body text-ns-muted uppercase tracking-widest px-2 pb-1">Personal</p>
            {DROPDOWN_ITEMS.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-body text-ns-muted hover:text-white hover:bg-white/5 transition-colors"
              >
                <Icon size={15} className="flex-shrink-0 opacity-70" />
                {label}
              </Link>
            ))}
          </nav>
        )}

        {/* Drawer footer */}
        <div className="mt-auto border-t border-ns-border px-4 py-4">
          {session ? (
            <div className="space-y-3">
              <Link
                href={`/profile/${username}`}
                className="flex items-center gap-2.5 px-1 group"
              >
                <Avatar src={avatarUrl} username={username} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-body text-white truncate group-hover:text-ns-secondary-readable transition-colors">@{username}</p>
                  <p className="text-[11px] font-body text-ns-muted">View Profile</p>
                </div>
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-body text-ns-muted hover:text-rose-400 hover:bg-white/5 transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Button variant="ghost"   size="sm" href="/login"    className="w-full justify-center">Log In</Button>
              <Button variant="primary" size="sm" href="/register" className="w-full justify-center">Sign Up</Button>
            </div>
          )}
        </div>
      </div>
      </>}
    </>
  )
}
