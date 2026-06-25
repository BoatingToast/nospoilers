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
  LockIcon,
  CloseIcon,
  ArrowRightIcon,
  type IconProps,
} from '@/components/icons'

// ─── Primary nav (4 items max) ───────────────────────────────────────────────

interface NavLink {
  href:         string
  label:        string
  authRequired: boolean
  highlight?:   boolean
}

const NAV_LINKS: NavLink[] = [
  { href: '/discover',           label: 'Discover',    authRequired: false },
  { href: '/collections',        label: 'Collections', authRequired: false },
  { href: '/my-recommendations', label: 'Recs',        authRequired: true, highlight: true },
  { href: '/dashboard',          label: 'Dashboard',   authRequired: true  },
]

// ─── Profile dropdown items ───────────────────────────────────────────────────

interface DropdownItem {
  href:  string
  label: string
  Icon:  React.ComponentType<IconProps>
}

const DROPDOWN_ITEMS: DropdownItem[] = [
  { href: '/dashboard',         label: 'Dashboard',        Icon: DashboardIcon    },
  { href: '/watchlist',         label: 'Watchlist',        Icon: WatchlistIcon    },
  { href: '/ratings',           label: 'Ratings',          Icon: RatingsIcon      },
  { href: '/friends',           label: 'Friends',          Icon: FriendsIcon      },
  { href: '/achievements',      label: 'Achievements',     Icon: AchievementsIcon },
  { href: '/settings/profile',  label: 'Edit Profile',     Icon: LockIcon         },
  { href: '/settings/privacy',  label: 'Privacy Settings', Icon: LockIcon         },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isActive(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

// ─── Profile dropdown ─────────────────────────────────────────────────────────

function ProfileDropdown({ username, avatarUrl }: { username: string; avatarUrl: string | null }) {
  const [open,    setOpen]    = useState(false)
  const ref = useRef<HTMLDivElement>(null)
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

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-label="Profile menu"
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
      <div
        className={`absolute right-0 top-full mt-2 w-52 bg-ns-surface border border-ns-border rounded-2xl shadow-2xl overflow-hidden
                    transition-all duration-150 origin-top-right
                    ${open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}
      >
        {/* User info header */}
        <div className="px-4 py-3 border-b border-ns-border">
          <p className="text-sm font-body text-white font-medium">@{username}</p>
          <Link
            href={`/profile/${username}`}
            className="text-[11px] font-body text-ns-gold hover:text-amber-400 transition-colors"
            onClick={() => setOpen(false)}
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
              onClick={() => setOpen(false)}
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
            onClick={() => signOut({ callbackUrl: '/' })}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm font-body text-ns-muted hover:text-rose-400 hover:bg-white/5 transition-colors"
          >
            <ArrowRightIcon size={15} className="flex-shrink-0 opacity-70" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Navbar ──────────────────────────────────────────────────────────────

export default function Navbar() {
  const { data: session } = useSession()
  const pathname           = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)

  const username  = session?.user?.name ?? ''
  const avatarUrl = session?.user?.image ?? null

  useEffect(() => { setMobileOpen(false) }, [pathname])

  useEffect(() => {
    if (!mobileOpen) return
    function handler(e: MouseEvent) {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) setMobileOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [mobileOpen])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const visibleLinks = NAV_LINKS.filter(l => !l.authRequired || session)

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-ns-bg/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 relative flex items-center justify-between gap-4">

          {/* Logo */}
          <Link
            href={session ? '/dashboard' : '/'}
            className="font-display text-xl sm:text-2xl tracking-widest text-ns-text hover:text-ns-gold transition-colors flex-shrink-0"
          >
            NOSPOILERS
          </Link>

          {/* Desktop nav — absolutely centered */}
          <nav
            className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2"
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
                        : 'text-ns-gold hover:text-amber-300'
                      : active
                        ? 'text-ns-gold'
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
                          : 'bg-ns-gold scale-x-0 group-hover:scale-x-100'
                        : active
                          ? 'bg-ns-gold scale-x-100'
                          : 'bg-white/25 scale-x-0 group-hover:scale-x-100',
                    ].join(' ')}
                  />
                </Link>
              )
            })}
          </nav>

          {/* Right — search + profile dropdown / auth */}
          <div className="flex items-center gap-2 sm:gap-3">

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
              onClick={() => setMobileOpen(v => !v)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
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
      <div
        className={`fixed inset-0 z-40 bg-black/60 md:hidden transition-opacity duration-200 ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      <div
        ref={drawerRef}
        className={`fixed top-0 right-0 bottom-0 z-50 w-72 max-w-[85vw] bg-ns-surface border-l border-ns-border
                    flex flex-col md:hidden transition-transform duration-300 ease-in-out
                    ${mobileOpen ? 'translate-x-0' : 'translate-x-full'}`}
        aria-label="Mobile navigation"
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-ns-border">
          <span className="font-display text-lg tracking-widest text-ns-text">NOSPOILERS</span>
          <button
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
                    ? active ? 'text-amber-300 bg-ns-gold/15' : 'text-ns-gold hover:text-amber-300 hover:bg-ns-gold/10'
                    : active ? 'text-ns-gold bg-ns-gold/8'    : 'text-white/60 hover:text-white hover:bg-white/5',
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
                  <p className="text-sm font-body text-white truncate group-hover:text-ns-gold transition-colors">@{username}</p>
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
    </>
  )
}
