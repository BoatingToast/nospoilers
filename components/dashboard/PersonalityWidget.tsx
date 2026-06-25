'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { UserPersonalityData } from '@/types'
import { getPersonalityIcon, ArrowRightIcon, FilmIcon } from '@/components/icons'

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
    <div className="bg-ns-surface border border-ns-border rounded-2xl overflow-hidden">
      <div className={`${pt?.color ?? 'bg-ns-surface-2'} p-6`}>
        {pt ? (
          <>
            {(() => { const Ico = getPersonalityIcon(pt.slug); return <span style={{ color: pt.accentHex }} className="block mb-3"><Ico size={36} /></span> })()}
            <p className="text-ns-muted text-[10px] tracking-widest uppercase font-body mb-1">
              Your Movie Personality
            </p>
            <h3 className="font-display text-3xl tracking-wider mb-2" style={{ color: pt.accentHex }}>
              {pt.name}
            </h3>
            <p className="text-ns-muted text-xs font-body leading-relaxed">{pt.description}</p>

            {st && (
              <div className="mt-3 flex items-center gap-2">
                {(() => { const Ico = getPersonalityIcon(st.slug); return <Ico size={16} className="text-ns-muted/60" /> })()}
                <span className="text-ns-muted text-xs font-body">Also: {st.name}</span>
              </div>
            )}

            {/* Traits */}
            <div className="flex flex-wrap gap-1.5 mt-4">
              {pt.traits.map(t => (
                <span
                  key={t}
                  className="px-2.5 py-1 rounded-full text-[11px] font-body border"
                  style={{ color: pt.accentHex, borderColor: `${pt.accentHex}40`, background: `${pt.accentHex}10` }}
                >
                  {t}
                </span>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <FilmIcon size={40} className="text-ns-gold/40 mx-auto mb-3" />
            <p className="text-ns-muted text-sm font-body mb-4">
              Your Movie Personality hasn&apos;t been discovered yet.
            </p>
            <button
              onClick={assign}
              disabled={loading}
              className="px-6 py-2.5 bg-ns-gold text-ns-bg text-sm font-body font-medium rounded-xl hover:bg-ns-gold/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Analyzing...' : 'Discover My Personality'}
            </button>
          </div>
        )}
      </div>

      {pt && (
        <div className="px-5 py-4 flex items-center justify-between border-t border-ns-border">
          <Link
            href={`/profile/${username}`}
            className="text-ns-muted text-xs font-body hover:text-ns-text transition-colors flex items-center gap-0.5"
          >
            View Public Profile <ArrowRightIcon size={11} />
          </Link>
          <button
            onClick={assign}
            disabled={loading}
            className="text-ns-muted/50 text-xs font-body hover:text-ns-muted transition-colors disabled:opacity-30"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      )}
    </div>
  )
}
