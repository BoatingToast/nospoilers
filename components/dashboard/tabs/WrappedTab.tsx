'use client'

import Link from 'next/link'
import { WrappedIcon, ArrowRightIcon } from '@/components/icons'

export default function WrappedTab() {
  const year = new Date().getFullYear()
  return (
    <div className="py-12 text-center">
      <div className="flex justify-center mb-5">
        <WrappedIcon size={52} className="text-ns-gold" />
      </div>
      <h2 className="font-heading text-2xl text-white mb-2">{year} Wrapped</h2>
      <p className="text-ns-muted font-body text-sm mb-8">
        Your year in film — genres, ratings, and milestones.
      </p>
      <Link
        href="/wrapped"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-ns-gold text-ns-bg text-sm font-body font-medium hover:bg-amber-400 transition-colors"
      >
        View {year} Wrapped <ArrowRightIcon size={14} />
      </Link>
    </div>
  )
}
