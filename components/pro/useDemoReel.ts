'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export const DEMO_STEP_MS = 1900

/**
 * Plays a set of product demos in order, one step at a time. Playback stops
 * when the viewer pauses, hovers a choice, scrolls away, or has asked for less
 * motion, and resumes from where it stopped.
 */
export function useDemoReel(stepCounts: readonly number[]) {
  const frameRef = useRef<HTMLDivElement>(null)
  const elapsedRef = useRef(0)
  const [index, setIndex] = useState(0)
  const [step, setStep] = useState(0)
  const [cycle, setCycle] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [held, setHeld] = useState(false)
  const [inView, setInView] = useState(false)
  const [motionOn, setMotionOn] = useState<boolean | null>(null)
  const [sitePaused, setSitePaused] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    const syncSitePause = () => setSitePaused(Boolean(root.dataset.motionPaused))
    setMotionOn(root.dataset.motion === 'on')
    syncSitePause()

    const attributes = new MutationObserver(syncSitePause)
    attributes.observe(root, { attributes: true, attributeFilter: ['data-motion-paused'] })

    const frame = frameRef.current
    const visibility = frame
      ? new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.3 })
      : null
    if (frame) visibility?.observe(frame)

    return () => {
      attributes.disconnect()
      visibility?.disconnect()
    }
  }, [])

  const running = playing && !held && inView && motionOn === true && !sitePaused
  const stepCount = stepCounts[index] ?? 1
  const reelLength = stepCounts.length

  useEffect(() => {
    elapsedRef.current = 0
  }, [index, step, cycle])

  useEffect(() => {
    if (!running) return
    const startedAt = performance.now()
    const timer = window.setTimeout(() => {
      if (step + 1 < stepCount) {
        setStep(step + 1)
        return
      }
      setIndex((index + 1) % reelLength)
      setStep(0)
      setCycle(value => value + 1)
    }, Math.max(60, DEMO_STEP_MS - elapsedRef.current))
    return () => {
      window.clearTimeout(timer)
      elapsedRef.current += performance.now() - startedAt
    }
  }, [running, index, step, cycle, stepCount, reelLength])

  function select(next: number) {
    if (next === index) return
    setIndex(next)
    setStep(0)
    setCycle(value => value + 1)
  }

  return {
    frameRef,
    index,
    // Viewers who prefer less motion see each demo's finished state.
    step: motionOn === false ? stepCount - 1 : step,
    cycle,
    playing,
    running,
    canAnimate: motionOn === true,
    durationMs: stepCount * DEMO_STEP_MS,
    togglePlaying: useCallback(() => setPlaying(value => !value), []),
    setHeld,
    select,
  }
}
