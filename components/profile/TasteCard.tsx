'use client'

import { useState } from 'react'
import type { PersonalityType, DNAScores } from '@/types'
import { getPersonalityIcon, FilmIcon } from '@/components/icons'
import Button from '@/components/ui/Button'

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

  const accent = personality?.accentHex ?? 'rgb(var(--ns-secondary))'
  const PersonalityIcon = personality ? getPersonalityIcon(personality.slug) : null

  return (
    <div className="min-w-0 border-t-2 border-ns-text pt-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-body text-ns-muted">
          <span className="tracking-widest text-ns-secondary-readable">NOSPOILERS</span> · @{username}
        </p>
        {PersonalityIcon
          ? <span style={{ color: accent }}><PersonalityIcon size={22} /></span>
          : <FilmIcon size={22} className="text-ns-secondary-readable/60" />}
      </div>

      {/* Personality */}
      <div className="mt-4 border-t border-ns-border pt-3">
        <p className="text-ns-muted text-[11px] tracking-widest uppercase font-body">Movie Personality</p>
        <p className="mt-1 font-display text-2xl leading-none tracking-wide" style={{ color: accent }}>
          {personality?.name ?? 'Film Lover'}
        </p>
      </div>

      {/* Top movies */}
      {topMovies.length > 0 && (
        <div className="mt-4 border-t border-ns-border pt-3">
          <p className="text-ns-muted text-[11px] tracking-widest uppercase font-body mb-1.5">Top Films</p>
          <ol>
            {topMovies.map((title, i) => (
              <li key={i} className="text-ns-text text-sm font-body leading-relaxed">
                <span className="text-ns-secondary-readable mr-1.5">{i + 1}.</span>{title}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* DNA highlights */}
      {topTraits.length > 0 && (
        <div className="mt-4 border-t border-ns-border pt-3">
          <p className="text-ns-muted text-[11px] tracking-widest uppercase font-body mb-2">Movie DNA</p>
          {topTraits.map(trait => (
            <div key={trait.label} className="flex items-center gap-3 mb-1.5">
              <span className="text-ns-muted text-xs font-body w-20 flex-shrink-0">{trait.label}</span>
              <div className="flex-1 h-0.5 bg-ns-border overflow-hidden">
                <div
                  className="h-full"
                  style={{ width: `${trait.value * 10}%`, background: accent }}
                />
              </div>
              <span className="text-xs font-body w-9 text-right" style={{ color: accent }}>
                {Math.round(trait.value * 10)}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Share button */}
      <div className="mt-5">
        <Button variant="secondary" onClick={share} className="w-full sm:w-auto">
          <svg aria-hidden="true" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/>
          </svg>
          {copied ? 'Link copied!' : 'Share Taste Card'}
        </Button>
      </div>
    </div>
  )
}
