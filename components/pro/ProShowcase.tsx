'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import Button from '@/components/ui/Button'
import { ArrowRightIcon } from '@/components/icons'
import { PRO_TOOLS } from './pro-tools'
import ProDemoStage, { demoProgressStyle } from './ProDemoStage'
import { PRO_DEMOS, type ProDemoId } from './ProDemos'
import { useDemoReel } from './useDemoReel'

const ENTRIES: Array<{ id: ProDemoId; href: string; title: string; description: string; action: string }> = [
  ...PRO_TOOLS.map(({ slug, title, description, action }) => ({ id: slug, href: `/pro/${slug}`, title, description, action })),
  { id: 'theater', href: '/theater', title: 'NoSpoilers Theater', description: 'Watch independent premieres with other film fans.', action: 'Enter the theater' },
]

/** The lobby's tool list. Each row launches a tool and previews it on the stage. */
export default function ProShowcase() {
  const stepCounts = useMemo(() => ENTRIES.map(entry => PRO_DEMOS[entry.id].steps), [])
  const reel = useDemoReel(stepCounts)
  const active = ENTRIES[reel.index]

  return (
    <section aria-labelledby="pro-tools-heading" className="mt-8 grid gap-6 sm:mt-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-14">
      <h2 id="pro-tools-heading" className="sr-only">Pro tools</h2>

      <ProDemoStage
        id={active.id}
        title={active.title}
        step={reel.step}
        canAnimate={reel.canAnimate}
        playing={reel.playing}
        onTogglePlaying={reel.togglePlaying}
        frameRef={reel.frameRef}
        className="lg:sticky lg:top-24 lg:order-2"
        footer={<Button href={active.href} size="lg" className="w-full sm:w-auto">{active.action}<ArrowRightIcon size={17} /></Button>}
      />

      <ul className="divide-y divide-ns-border lg:order-1">
        {ENTRIES.map((entry, index) => {
          const selected = index === reel.index
          return (
            <li key={entry.id} className="relative">
              <Link
                href={entry.href}
                aria-label={`Open ${entry.title}`}
                onMouseEnter={() => { reel.select(index); reel.setHeld(true) }}
                onMouseLeave={() => reel.setHeld(false)}
                onFocus={() => { reel.select(index); reel.setHeld(true) }}
                onBlur={() => reel.setHeld(false)}
                className="group grid min-h-[84px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 py-4"
              >
                <span className="min-w-0">
                  <span className={`block font-heading text-xl font-bold transition-colors duration-200 sm:text-2xl ${selected ? 'text-ns-text' : 'text-ns-muted group-hover:text-ns-text'}`}>
                    {entry.title}
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-ns-muted">{entry.description}</span>
                </span>
                <ArrowRightIcon
                  size={20}
                  className={`transition-[color,transform] duration-200 group-hover:translate-x-1 ${selected ? 'text-ns-secondary-readable' : 'text-ns-subtle'}`}
                />
              </Link>
              {selected && reel.canAnimate && (
                <span
                  key={reel.cycle}
                  aria-hidden="true"
                  className="ns-progress pointer-events-none absolute inset-x-0 -bottom-px h-0.5 bg-ns-secondary"
                  style={demoProgressStyle(reel.durationMs, reel.running)}
                />
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
