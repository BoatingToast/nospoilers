'use client'

import { useState } from 'react'
import type { PersonalityType, DNAScores } from '@/types'
import { ShareIcon } from '@/components/icons'
import Button from '@/components/ui/Button'
import { growOnReveal } from './motion'

interface Props {
  username:    string
  personality: PersonalityType | null
  dnaScores:   DNAScores | null
  topMovies:   string[]
}

const DNA_LABELS: Record<string, string> = {
  suspenseScore:        'Suspense',
  emotionalImpactScore: 'Emotional',
  complexityScore:      'Complexity',
  humorScore:           'Humor',
  realismScore:         'Realism',
  actionScore:          'Action',
  darknessScore:        'Darkness',
}

export default function TasteCard({ username, personality, dnaScores, topMovies }: Props) {
  const [copied, setCopied] = useState(false)

  const profileUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/profile/${username}`

  async function share() {
    const text = `Check out my Movie Taste Profile on NoSpoilers! I'm ${personality?.name ?? 'a film lover'}`
    if (navigator.share) {
      await navigator.share({ title: 'My NoSpoilers Taste Card', text, url: profileUrl }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(profileUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Top 3 DNA traits
  const topTraits = dnaScores
    ? Object.entries(dnaScores)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([key, val]) => ({ label: DNA_LABELS[key] ?? key, value: val }))
    : []

  return (
    <div className="flex h-full flex-col rounded-2xl bg-ns-surface p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm text-ns-muted">@{username}</p>
          <p className="mt-1 break-words font-display text-2xl text-ns-text sm:text-3xl">
            {personality?.name ?? 'Film Lover'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={share} className="flex-shrink-0">
          <ShareIcon size={14} />
          <span key={String(copied)} className="animate-fade-up">{copied ? 'Link copied!' : 'Share taste card'}</span>
        </Button>
      </div>

      {(topMovies.length > 0 || topTraits.length > 0) && (
      <div className="mt-6 grid flex-1 gap-6 sm:grid-cols-2">
        {topMovies.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-ns-muted">Top films</h3>
            <ol className="mt-2 space-y-1.5">
              {topMovies.map((title, i) => (
                <li key={i} className="flex gap-2 text-base text-ns-text">
                  <span className="w-4 flex-shrink-0 font-semibold tabular-nums text-ns-secondary-readable">{i + 1}</span>
                  <span className="min-w-0 break-words">{title}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {topTraits.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-ns-muted">Movie DNA</h3>
            <div className="mt-3 space-y-3">
              {topTraits.map(trait => (
                <div key={trait.label}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="text-ns-text">{trait.label}</span>
                    <span className="font-semibold tabular-nums text-ns-text">{Math.round(trait.value * 10)}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ns-surface-3">
                    <div
                      className={`h-full rounded-full bg-ns-secondary ${growOnReveal}`}
                      style={{ width: `${Math.min(100, trait.value * 10)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  )
}
