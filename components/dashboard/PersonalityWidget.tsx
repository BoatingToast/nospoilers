'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { UserPersonalityData } from '@/types'
import { getPersonalityIcon, ArrowRightIcon } from '@/components/icons'
import Button from '@/components/ui/Button'
import Section from '@/components/ui/Section'

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

  return (
    <Section title="Your Movie Personality">
      {pt ? (
        <>
          <div className="flex items-center gap-3">
            {(() => { const Ico = getPersonalityIcon(pt.slug); return <span style={{ color: pt.accentHex }} className="flex-shrink-0"><Ico size={28} /></span> })()}
            <h3 className="font-display text-3xl leading-none tracking-wide" style={{ color: pt.accentHex }}>
              {pt.name}
            </h3>
          </div>
          <p className="mt-3 max-w-2xl font-body text-sm leading-relaxed text-ns-muted">{pt.description}</p>

          {st && (
            <p className="mt-3 font-body text-sm text-ns-muted">Also: {st.name}</p>
          )}

          {/* Traits */}
          {pt.traits.length > 0 && (
            <p className="mt-3 font-body text-sm text-ns-text">{pt.traits.join(' · ')}</p>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-ns-border pt-3">
            <Link
              href={`/profile/${username}`}
              className="inline-flex items-center gap-1 font-heading text-sm text-ns-secondary-readable underline underline-offset-4 hover:text-ns-text"
            >
              View Public Profile <ArrowRightIcon size={11} />
            </Link>
            <Button variant="ghost" size="sm" onClick={assign} disabled={loading} className="min-h-10">
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </>
      ) : (
        <div>
          <p className="font-body text-sm text-ns-muted">
            Your Movie Personality hasn&apos;t been discovered yet.
          </p>
          <Button variant="secondary" onClick={assign} disabled={loading} className="mt-4">
            {loading ? 'Analyzing...' : 'Discover My Personality'}
          </Button>
        </div>
      )}
    </Section>
  )
}
