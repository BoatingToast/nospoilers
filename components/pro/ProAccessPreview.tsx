'use client'

import { useMemo } from 'react'
import { PRO_TOOLS } from './pro-tools'
import ProDemoStage from './ProDemoStage'
import { PRO_DEMOS, type ProDemoId } from './ProDemos'
import { useDemoReel } from './useDemoReel'

/** Shows the tool a visitor asked for, or every tool when they arrived without one. */
export default function ProAccessPreview({ slug }: { slug?: ProDemoId }) {
  const entries = useMemo(() => PRO_TOOLS.filter(tool => !slug || tool.slug === slug), [slug])
  const stepCounts = useMemo(() => entries.map(entry => PRO_DEMOS[entry.slug].steps), [entries])
  const reel = useDemoReel(stepCounts)
  const active = entries[reel.index]

  return (
    <ProDemoStage
      id={active.slug}
      title={active.title}
      step={reel.step}
      canAnimate={reel.canAnimate}
      playing={reel.playing}
      onTogglePlaying={reel.togglePlaying}
      frameRef={reel.frameRef}
    />
  )
}
