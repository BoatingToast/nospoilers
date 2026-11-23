'use client'

import { signOut } from 'next-auth/react'

export default function DashboardSignOut() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/' })}
      type="button"
      className="min-h-11 rounded-full px-4 text-sm font-semibold text-ns-muted transition-colors hover:bg-ns-surface hover:text-ns-text"
    >
      Sign Out
    </button>
  )
}
