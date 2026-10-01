'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import {
  ArrowRightIcon,
  CheckIcon,
  EyeOffIcon,
  LockIcon,
  SpoilerFreeIcon,
} from '@/components/icons'

const FEATURES = [
  {
    title: 'Covers spoilers in live feeds',
    copy: 'Shield checks new posts, headlines, and search results as they appear, then hides risky blocks until you reveal them.',
    Icon: EyeOffIcon,
  },
  {
    title: 'Syncs your Plot Passport',
    copy: 'Send every unfinished movie from NoSpoilers to Chrome in one click while keeping your manually protected titles intact.',
    Icon: SpoilerFreeIcon,
  },
  {
    title: 'Keeps page content private',
    copy: 'Classification happens on your device. The pages you browse are never uploaded to NoSpoilers.',
    Icon: LockIcon,
  },
]

function HiddenPost({ source, title }: { source: string; title: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="h-7 w-7 rounded-full bg-white/10" />
          <div>
            <p className="text-[11px] font-heading font-semibold text-white/80">{source}</p>
            <p className="text-[9px] font-body uppercase tracking-wider text-white/35">Just now</p>
          </div>
        </div>
        <span className="rounded-full border border-ns-secondary/30 bg-ns-secondary/10 px-2 py-1 text-[9px] font-body uppercase tracking-wider text-ns-secondary-readable">
          Protected
        </span>
      </div>

      <div className="mt-4 rounded-xl border border-ns-secondary/25 bg-ns-bg/90 p-4 shadow-[inset_0_0_32px_rgb(var(--ns-secondary)/0.08)]">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-ns-secondary text-white">
            <EyeOffIcon size={17} />
          </span>
          <div className="min-w-0">
            <p className="font-heading text-sm font-semibold text-ns-text">Potential spoiler hidden</p>
            <p className="mt-1 text-xs leading-relaxed font-body text-ns-muted">
              This post mentions <span className="text-ns-text">{title}</span> with spoiler-like language.
            </p>
            <span className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-body font-semibold uppercase tracking-wider text-ns-secondary-readable">
              Reveal only when ready
              <ArrowRightIcon size={11} />
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ShieldFeature() {
  const { status } = useSession()
  const passportHref = status === 'authenticated' ? '/plot-passport' : '/register'
  const passportLabel = status === 'authenticated' ? 'Open Plot Passport' : 'Build my protection list'

  return (
    <section id="shield" aria-labelledby="shield-title" className="relative overflow-hidden border-y border-ns-border bg-ns-surface/30 px-4 py-24 sm:px-6">
      <div className="pointer-events-none absolute -left-40 top-1/3 h-96 w-96 rounded-full bg-ns-secondary/10 blur-[110px]" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-52 bottom-0 h-96 w-96 rounded-full bg-ns-info/10 blur-[120px]" aria-hidden="true" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-ns-secondary/30 bg-ns-secondary/10 px-3 py-1.5 text-[10px] font-body font-semibold uppercase tracking-[0.2em] text-ns-secondary-readable">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ns-secondary-readable opacity-40 motion-reduce:animate-none" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-ns-secondary-readable" />
            </span>
            Chrome extension beta
          </div>

          <p className="mb-3 text-xs font-body uppercase tracking-[0.24em] text-ns-secondary-readable">NoSpoilers Shield</p>
          <h2 id="shield-title" className="max-w-2xl font-display text-5xl leading-[0.94] tracking-wider text-ns-text sm:text-6xl lg:text-7xl">
            THE WEB CAN&apos;T WARN YOU. SHIELD CAN.
          </h2>
          <p className="mt-6 max-w-xl text-base leading-relaxed font-body text-ns-muted sm:text-lg">
            Protect the movies and shows you have not finished yet. Shield covers likely spoilers across social feeds, video sites, search results, and news pages until you choose to look.
          </p>

          <div className="mt-8 grid gap-5 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {FEATURES.map(({ title, copy, Icon }) => (
              <div key={title} className="rounded-2xl border border-ns-border bg-ns-bg/45 p-4">
                <Icon size={18} className="text-ns-secondary-readable" />
                <h3 className="mt-3 text-sm font-heading font-semibold text-ns-text">{title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed font-body text-ns-muted">{copy}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={passportHref}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-ns-secondary px-5 py-3 text-sm font-body font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-ns-secondary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ns-secondary-readable focus-visible:ring-offset-2 focus-visible:ring-offset-ns-bg"
            >
              {passportLabel}
              <ArrowRightIcon size={14} />
            </Link>
            <Link
              href="/privacy/extension"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-ns-border bg-ns-surface px-5 py-3 text-sm font-body font-semibold text-ns-text transition-colors hover:border-ns-secondary-readable/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ns-secondary-readable focus-visible:ring-offset-2 focus-visible:ring-offset-ns-bg"
            >
              <LockIcon size={14} />
              See how privacy works
            </Link>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl">
          <div className="absolute -inset-6 rounded-[2.25rem] bg-gradient-to-br from-ns-secondary/20 via-transparent to-ns-info/10 blur-2xl" aria-hidden="true" />
          <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-ns-bg shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between border-b border-white/10 bg-ns-surface/80 px-4 py-3">
              <div className="flex items-center gap-1.5" aria-hidden="true">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-300/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-ns-bg/60 px-3 py-1.5">
                <LockIcon size={10} className="text-ns-success" />
                <span className="text-[9px] font-body text-ns-muted">your-feed.example</span>
              </div>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ns-secondary text-white">
                <SpoilerFreeIcon size={14} />
              </span>
            </div>

            <div className="p-4 sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-heading font-semibold text-ns-text">Your feed</p>
                  <p className="mt-0.5 text-[10px] font-body text-ns-muted">Shield is actively checking new posts</p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-ns-success/10 px-2.5 py-1 text-[9px] font-body font-semibold uppercase tracking-wider text-ns-success">
                  <CheckIcon size={10} />
                  Protection on
                </span>
              </div>

              <div className="space-y-3">
                <HiddenPost source="MovieTalk" title="The Odyssey" />
                <HiddenPost source="Film Weekly" title="Spider-Man: Brand New Day" />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
                <span className="text-[9px] font-body uppercase tracking-wider text-ns-muted/70">Plot Passport</span>
                {['The Odyssey', 'Project Hail Mary', 'Disclosure Day'].map(title => (
                  <span key={title} className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[9px] font-body text-ns-muted">
                    {title}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
