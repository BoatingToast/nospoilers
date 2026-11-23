'use client'

import { useState } from 'react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import { SectionLink } from './SectionHeading'
import type { UserPersonalityData } from '@/types'
import { getPersonalityIcon } from '@/components/icons'

interface Props {
  username:    string
  initialData: UserPersonalityData | null
}

export default function PersonalityWidget({ username, initialData }: Props) {
  const [data,    setData]    = useState<UserPersonalityData | null>(initialData)
  const [loading, setLoading] = useState(false)

  async function assign() {
    setLoading(true)
    try {
      const res  = await fetch('/api/personality/assign', { method: 'POST' })
      const json = await res.json()
      if (res.ok) setData(json)
    } finally {
      setLoading(false)
    }
  }

  const pt = data?.primaryType
  const st = data?.secondaryType

  if (!pt) {
    return (
      <EmptyState
        title="Your Movie Personality"
        description="Your Movie Personality hasn't been discovered yet."
        action={<Button onClick={assign} loading={loading}>{loading ? 'Analyzing...' : 'Discover My Personality'}</Button>}
      />
    )
  }

  const PrimaryIcon = getPersonalityIcon(pt.slug)
  const SecondaryIcon = st ? getPersonalityIcon(st.slug) : null

  return (
    <section className="ns-reveal rounded-3xl bg-ns-tile-lilac p-7 sm:p-10">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ns-muted">Your Movie Personality</p>
          <h3 className="mt-2 font-display text-3xl text-ns-text sm:text-4xl">{pt.name}</h3>
        </div>
        <PrimaryIcon size={36} className="flex-shrink-0 text-ns-text" />
      </div>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-ns-muted">{pt.description}</p>

      {st && SecondaryIcon && (
        <p className="mt-3 flex items-center gap-2 text-sm text-ns-muted">
          <SecondaryIcon size={16} /> Also: {st.name}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {pt.traits.map(t => (
          <Badge key={t} variant="outline" size="md">{t}</Badge>
        ))}
      </div>

      <div className="-ml-3 mt-6 flex flex-wrap items-center gap-1">
        <SectionLink href={`/profile/${username}`}>View Public Profile</SectionLink>
        <Button variant="ghost" size="sm" onClick={assign} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>
    </section>
  )
}
