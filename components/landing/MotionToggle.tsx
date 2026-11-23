'use client'

import { useState } from 'react'

/** Lets viewers stop the looping poster row and ambient hero motion. */
export default function MotionToggle() {
  const [paused, setPaused] = useState(false)

  function toggle() {
    const next = !paused
    setPaused(next)
    if (next) document.documentElement.dataset.motionPaused = 'true'
    else delete document.documentElement.dataset.motionPaused
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex min-h-10 items-center gap-2 rounded-full px-3.5 text-sm font-medium text-ns-muted transition-colors hover:bg-ns-surface hover:text-ns-text"
    >
      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        {paused ? <path d="M7 4.5v15l12-7.5z" /> : <path d="M6 4h4v16H6zM14 4h4v16h-4z" />}
      </svg>
      {paused ? 'Play motion' : 'Pause motion'}
    </button>
  )
}
