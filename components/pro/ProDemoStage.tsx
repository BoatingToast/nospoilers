'use client'

import type { CSSProperties, ReactNode, RefObject } from 'react'
import { PRO_DEMOS, type ProDemoId } from './ProDemos'

interface ProDemoStageProps {
  id: ProDemoId
  title: string
  step: number
  canAnimate: boolean
  playing: boolean
  onTogglePlaying: () => void
  frameRef: RefObject<HTMLDivElement>
  footer?: ReactNode
  className?: string
}

/** The framed product preview. Its contents are illustrative, so they are hidden from assistive tech. */
export default function ProDemoStage({
  id,
  title,
  step,
  canAnimate,
  playing,
  onTogglePlaying,
  frameRef,
  footer,
  className = '',
}: ProDemoStageProps) {
  const { Demo } = PRO_DEMOS[id]
  return (
    <div ref={frameRef} className={`flex flex-col rounded-3xl bg-ns-surface p-5 sm:p-8 ${className}`}>
      <div className="flex min-h-11 items-center justify-between gap-3">
        <p key={id} aria-hidden="true" className="min-w-0 animate-fade-up truncate font-heading text-xl font-bold text-ns-text">{title}</p>
        {canAnimate && (
          <button
            type="button"
            onClick={onTogglePlaying}
            className="inline-flex min-h-11 flex-shrink-0 items-center rounded-full px-4 text-sm font-semibold text-ns-muted transition-colors hover:bg-ns-surface-2 hover:text-ns-text"
          >
            {playing ? 'Pause demo' : 'Play demo'}
          </button>
        )}
      </div>
      <div key={id} aria-hidden="true" className="mt-4 h-[340px] animate-fade-up overflow-hidden sm:h-[372px]">
        <Demo step={step} />
      </div>
      {footer && <div className="mt-5">{footer}</div>}
    </div>
  )
}

export function demoProgressStyle(durationMs: number, running: boolean): CSSProperties {
  return {
    '--ns-progress-duration': `${durationMs}ms`,
    animationPlayState: running ? 'running' : 'paused',
  } as CSSProperties
}
