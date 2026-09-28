'use client'

import { useState } from 'react'
import Link from 'next/link'
import { HeartIcon, MovieDnaIcon, ShareIcon } from '@/components/icons'
import type { RomComRoastResult } from '@/lib/rom-com-roast'

export type RoastAccess = 'ready' | 'signed-out' | 'needs-dna' | 'unavailable'

interface Props {
  movieTitle: string
  tmdbId: number
  access: RoastAccess
  result: RomComRoastResult | null
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
    <section className="relative mb-10 overflow-hidden rounded-3xl border border-rose-400/25 bg-ns-surface shadow-2xl shadow-rose-950/10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,63,94,0.18),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(217,70,239,0.12),transparent_34%)]" />

      <div className="relative p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-rose-300/25 bg-rose-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-200">
              <HeartIcon size={12} /> Rom-coms only
            </div>
            <h2 className="font-display text-3xl tracking-wider text-ns-text sm:text-4xl">
              ROAST MY ROM-COM DNA
            </h2>
            <p className="mt-2 max-w-2xl font-body text-sm leading-6 text-ns-muted">
              {movieTitle} has opinions about your romantic judgment. Let your Movie DNA hear them.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-ns-muted">
            <MovieDnaIcon size={16} className="text-rose-300" />
            Spoiler-free · emotionally unsafe
          </div>
        </div>

        {access === 'ready' && result && !revealed && (
          <div className="mt-7 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-lg text-sm text-ns-muted">
              One real compatibility score. One deeply unnecessary personal attack.
            </p>
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="rounded-xl bg-rose-500 px-5 py-3 font-body text-sm font-bold text-white transition hover:bg-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-300/70"
            >
              Roast my DNA
            </button>
          </div>
        )}

        {access === 'ready' && result && revealed && (
          <div className="mt-7 border-t border-white/10 pt-6" aria-live="polite">
            <div className="grid gap-6 lg:grid-cols-[180px_1fr] lg:items-center">
              <div className="flex items-center gap-4 lg:block lg:text-center">
                <div
                  className="grid h-28 w-28 flex-shrink-0 place-items-center rounded-full p-2 lg:mx-auto lg:h-32 lg:w-32"
                  style={{
                    background: `conic-gradient(rgb(244 63 94) ${result.matchScore * 3.6}deg, rgba(255,255,255,0.08) 0deg)`,
                  }}
                >
                  <div className="grid h-full w-full place-items-center rounded-full bg-ns-surface">
                    <div>
                      <div className="font-display text-4xl leading-none text-rose-300">{result.matchScore}%</div>
                      <div className="mt-1 text-[9px] uppercase tracking-widest text-ns-muted">DNA match</div>
                    </div>
                  </div>
                </div>
                <div className="lg:mt-3">
                  <p className="text-[10px] uppercase tracking-widest text-ns-muted">Best chemistry</p>
                  <p className="text-sm font-semibold text-rose-200">{result.strongestMatch}</p>
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-rose-300">The verdict</p>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-ns-muted">{result.verdict}</p>
                <blockquote className="mt-5 font-heading text-2xl font-semibold leading-tight text-white sm:text-3xl">
                  “{result.roast}”
                </blockquote>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-ns-muted">
                    Biggest red flag: <strong className="text-ns-text">{result.biggestMismatch}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={shareRoast}
                    className="inline-flex items-center gap-2 rounded-full border border-rose-300/25 bg-rose-400/10 px-3 py-1.5 text-xs font-semibold text-rose-200 transition hover:bg-rose-400/20"
                  >
                    <ShareIcon size={13} /> {copied ? 'Copied!' : 'Share the damage'}
                  </button>
                </div>
              </div>
            </div>
            <p className="mt-6 text-[10px] uppercase tracking-widest text-ns-muted/70">
              Scientifically questionable. Emotionally accurate.
            </p>
          </div>
        )}

        {access === 'signed-out' && (
          <div className="mt-7 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ns-muted">We need your Movie DNA before we can attack it.</p>
            <Link
              href={`/login?callbackUrl=${callbackUrl}`}
              className="rounded-xl bg-rose-500 px-5 py-3 text-center font-body text-sm font-bold text-white transition hover:bg-rose-400"
            >
              Sign in to get roasted
            </Link>
          </div>
        )}

        {access === 'needs-dna' && (
          <div className="mt-7 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ns-muted">No DNA, no evidence. Give us a few favorites first.</p>
            <Link
              href="/onboarding"
              className="rounded-xl bg-rose-500 px-5 py-3 text-center font-body text-sm font-bold text-white transition hover:bg-rose-400"
            >
              Build my Movie DNA
            </Link>
          </div>
        )}

        {access === 'unavailable' && (
          <p className="mt-7 border-t border-white/10 pt-6 text-sm text-ns-muted">
            The roast writer is having an emotional availability issue. Try again in a minute.
          </p>
        )}
      </div>
    </section>
  )
}
