'use client'

import { useState } from 'react'
import type { PersonalityType, DNAScores } from '@/types'
import { getPersonalityIcon, FilmIcon } from '@/components/icons'

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
    <div className="bg-ns-surface border border-ns-border rounded-2xl overflow-hidden">
      {/* Card preview */}
      <div
        className="relative p-5 pb-4 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #07070F 0%, #0C0C18 100%)' }}
      >
        {/* Accent glow */}
        {personality && (
          <div
            className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20"
            style={{ background: personality.accentHex }}
          />
        )}

        {/* Header */}
        <div className="flex items-start justify-between relative z-10">
          <div>
            <p className="text-[10px] tracking-widest text-ns-gold font-body mb-1">NOSPOILERS</p>
            <p className="text-ns-muted text-[10px] font-body">@{username}</p>
          </div>
          {personality
            ? (() => { const Ico = getPersonalityIcon(personality.slug); return <span style={{ color: personality.accentHex }}><Ico size={22} /></span> })()
            : <FilmIcon size={22} className="text-ns-gold/60" />}
        </div>

        {/* Personality */}
        <div className="mt-3 relative z-10">
          <p className="text-ns-muted text-[9px] tracking-widest uppercase font-body">Movie Personality</p>
          <p className="font-display text-xl tracking-wider mt-0.5" style={{ color: personality?.accentHex ?? '#C8963E' }}>
            {personality?.name ?? 'Film Lover'}
          </p>
        </div>

        {/* Top movies */}
        {topMovies.length > 0 && (
          <div className="mt-3 relative z-10">
            <p className="text-ns-muted text-[9px] tracking-widest uppercase font-body mb-1">Top Films</p>
            {topMovies.map((title, i) => (
              <p key={i} className="text-ns-text text-[11px] font-body leading-snug">
                <span className="text-ns-gold mr-1">{i + 1}.</span>{title}
              </p>
            ))}
          </div>
        )}

        {/* DNA highlights */}
        {topTraits.length > 0 && (
          <div className="mt-3 relative z-10">
            <p className="text-ns-muted text-[9px] tracking-widest uppercase font-body mb-1.5">Movie DNA</p>
            {topTraits.map(trait => (
              <div key={trait.label} className="flex items-center gap-2 mb-1">
                <span className="text-ns-muted text-[10px] font-body w-16 flex-shrink-0">{trait.label}</span>
                <div className="flex-1 h-0.5 bg-ns-border rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${trait.value * 10}%`, background: personality?.accentHex ?? '#C8963E' }}
                  />
                </div>
                <span className="text-[10px] font-body" style={{ color: personality?.accentHex ?? '#C8963E' }}>
                  {Math.round(trait.value * 10)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Share button */}
      <div className="p-3 border-t border-ns-border">
        <button
          onClick={share}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-ns-gold/10 border border-ns-gold/20
                     text-ns-gold text-xs font-body hover:bg-ns-gold/20 transition-colors"
        >
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/>
          </svg>
          {copied ? 'Link copied!' : 'Share Taste Card'}
        </button>
      </div>
    </div>
  )
}
