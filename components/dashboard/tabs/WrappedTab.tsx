'use client'

import Button from '@/components/ui/Button'
import { ArrowRightIcon } from '@/components/icons'

export default function WrappedTab() {
  const year = new Date().getFullYear()
  return (
    <section className="flex flex-col items-start gap-6 rounded-3xl bg-ns-tile-lilac p-7 sm:p-10 lg:flex-row lg:items-end lg:justify-between lg:p-14">
      <div>
        <h2 className="font-display text-4xl text-ns-text sm:text-6xl">{year} Wrapped</h2>
        <p className="mt-3 max-w-xl text-lg leading-relaxed text-ns-muted">
          Your year in film — genres, ratings, and milestones.
        </p>
      </div>
      <Button size="lg" href="/wrapped" className="flex-shrink-0">
        View {year} Wrapped <ArrowRightIcon size={16} />
      </Button>
    </section>
  )
}
