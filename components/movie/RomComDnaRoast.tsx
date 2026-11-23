'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import { ShareIcon } from '@/components/icons'
import type { RomComRoastResult } from '@/lib/rom-com-roast'
import GrowBar from './GrowBar'
import WipeText from './WipeText'

export type RoastAccess = 'ready' | 'signed-out' | 'needs-dna' | 'unavailable'

interface Props {
  movieTitle: string
  tmdbId: number
  access: RoastAccess
  result: RomComRoastResult | null
}

function ActionRow({ copy, children }: { copy: string; children: React.ReactNode }) {
  return (
    <div className="mt-7 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
      <p className="max-w-lg text-base text-ns-muted">{copy}</p>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

export default function RomComDnaRoast({ movieTitle, tmdbId, access, result }: Props) {
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)

  async function shareRoast() {
    if (!result) return

    const text = `${result.matchScore}% Rom-Com DNA match with ${movieTitle}: “${result.roast}”`
    const url = window.location.href

    try {
      if (navigator.share) {
        await navigator.share({ title: 'My Rom-Com DNA Roast', text, url })
        return
      }

      await navigator.clipboard.writeText(`${text} ${url}`)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Closing the native share sheet is not an error the card needs to surface.
    }
  }

  const callbackUrl = encodeURIComponent(`/movie/${tmdbId}`)

  return (
    <section aria-labelledby="rom-com-roast-title" className="ns-reveal rounded-3xl bg-ns-tile-rose p-7 sm:p-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 id="rom-com-roast-title" className="font-display text-3xl text-ns-text sm:text-4xl">
            Roast my rom-com DNA
          </h2>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-ns-muted">
            {movieTitle} has opinions about your romantic judgment. Let your Movie DNA hear them.
          </p>
        </div>
        <p className="text-sm text-ns-muted">Rom-coms only · Spoiler-free · emotionally unsafe</p>
      </div>

      {access === 'ready' && result && !revealed && (
        <ActionRow copy="One real compatibility score. One deeply unnecessary personal attack.">
          <Button variant="secondary" onClick={() => setRevealed(true)}>Roast my DNA</Button>
        </ActionRow>
      )}

      {access === 'ready' && result && revealed && (
        <div className="mt-7 border-t border-white/10 pt-6" aria-live="polite">
          <div className="grid gap-7 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10">
            <div>
              <p className="animate-fade-up font-display text-6xl tabular-nums text-ns-text">{result.matchScore}%</p>
              <p className="mt-1 text-sm text-ns-muted">DNA match</p>
              <GrowBar value={result.matchScore / 100} growOnMount className="mt-3" trackClassName="bg-black/25" />
              <p className="mt-5 text-sm text-ns-muted">Best chemistry</p>
              <p className="text-base font-semibold text-ns-text">{result.strongestMatch}</p>
            </div>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-ns-secondary-readable">The verdict</p>
              <p className="mt-2 max-w-2xl text-base leading-relaxed text-ns-muted">{result.verdict}</p>
              <blockquote className="mt-5 font-heading text-2xl font-bold leading-tight text-ns-text sm:text-3xl">
                <WipeText animate>“{result.roast}”</WipeText>
              </blockquote>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-black/25 px-4 py-2.5 text-sm text-ns-muted">
                  Biggest red flag: <strong className="font-semibold text-ns-text">{result.biggestMismatch}</strong>
                </span>
                <Button variant="secondary" onClick={shareRoast}>
                  <ShareIcon size={15} /> {copied ? 'Copied!' : 'Share the damage'}
                </Button>
              </div>
            </div>
          </div>
          <p className="mt-6 text-sm text-ns-muted">Scientifically questionable. Emotionally accurate.</p>
        </div>
      )}

      {access === 'signed-out' && (
        <ActionRow copy="We need your Movie DNA before we can attack it.">
          <Button variant="secondary" href={`/login?callbackUrl=${callbackUrl}`}>Sign in to get roasted</Button>
        </ActionRow>
      )}

      {access === 'needs-dna' && (
        <ActionRow copy="No DNA, no evidence. Give us a few favorites first.">
          <Button variant="secondary" href="/onboarding">Build my Movie DNA</Button>
        </ActionRow>
      )}

      {access === 'unavailable' && (
        <p className="mt-7 border-t border-white/10 pt-6 text-base text-ns-muted">
          The roast writer is having an emotional availability issue. Try again in a minute.
        </p>
      )}
    </section>
  )
}
