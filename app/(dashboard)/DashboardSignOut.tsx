'use client'

import { signOut } from 'next-auth/react'

export default function DashboardSignOut() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/' })}
      className="text-sm text-ns-muted hover:text-ns-text transition-colors font-body"
    >
      Sign Out
    </button>
  )
}
