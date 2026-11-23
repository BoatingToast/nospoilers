'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ITEMS = [
  { label: 'Profile', href: '/settings/profile' },
  { label: 'Notifications', href: '/settings/notifications' },
  { label: 'Privacy', href: '/settings/privacy' },
  { label: 'Import & export', href: '/settings/data' },
]

/**
 * Lives in the settings layout, so it stays mounted between routes and the
 * selection slides to the new section: 2x2 on phones, a row on tablets, and a
 * vertical list on desktop.
 */
export default function SettingsNav() {
  const pathname = usePathname()
  const index = ITEMS.findIndex(item => pathname === item.href || pathname.startsWith(`${item.href}/`))

  return (
    <nav aria-label="Settings sections" className="lg:sticky lg:top-28 lg:self-start">
      <p className="mb-3 hidden px-1 font-heading text-lg font-bold text-ns-text lg:block">Settings</p>
      <div className="relative grid grid-cols-2 rounded-3xl bg-ns-surface p-1 sm:grid-cols-4 sm:rounded-full lg:grid-cols-1 lg:rounded-3xl">
        {index >= 0 && (
          <span
            aria-hidden="true"
            className="absolute left-1 top-1 h-11 w-[calc((100%-0.5rem)/2)] rounded-full bg-ns-text transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] [transform:translate(calc(var(--col)*100%),calc(var(--row)*100%))] motion-reduce:transition-none sm:w-[calc((100%-0.5rem)/4)] sm:[transform:translateX(calc(var(--index)*100%))] lg:w-[calc(100%-0.5rem)] lg:[transform:translateY(calc(var(--index)*100%))]"
            style={{
              '--col': index % 2,
              '--row': Math.floor(index / 2),
              '--index': index,
            } as React.CSSProperties}
          />
        )}
        {ITEMS.map((item, itemIndex) => {
          const active = itemIndex === index
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`relative flex h-11 items-center justify-center whitespace-nowrap rounded-full px-3 text-sm font-semibold transition-colors duration-150 lg:justify-start lg:px-4
                ${active ? 'text-ns-bg' : 'text-ns-muted hover:text-ns-text'}`}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
