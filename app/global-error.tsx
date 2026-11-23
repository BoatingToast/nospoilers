'use client'

import Link from 'next/link'
import { useEffect } from 'react'

// This boundary replaces the root layout, so it cannot rely on globals.css.
const INK = '#F5F3F0'
const MUTED = '#B0AFB6'
const IRIS = '#7B61B3'
const ON_IRIS = '#F5F3F0'

const action = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 48,
  boxSizing: 'border-box',
  borderRadius: 999,
  padding: '0 24px',
  fontSize: 15,
  fontWeight: 600,
  textDecoration: 'none',
} as const

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#121214', color: INK, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, boxSizing: 'border-box' }}>
          <section role="alert" aria-labelledby="global-error-title" style={{ width: '100%', maxWidth: 560, textAlign: 'center' }}>
            <h1 id="global-error-title" style={{ margin: 0, fontSize: 'clamp(36px, 7vw, 52px)', lineHeight: 1.06, letterSpacing: '-0.03em' }}>
              The app could not start
            </h1>
            <p style={{ margin: '16px auto 0', maxWidth: 420, color: MUTED, fontSize: 17, lineHeight: 1.6 }}>
              Your data is safe. Try loading NoSpoilers again, or return home and start fresh.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 28 }}>
              <button type="button" onClick={reset} style={{ ...action, cursor: 'pointer', border: 0, background: IRIS, color: ON_IRIS }}>
                Try again
              </button>
              <Link href="/" style={{ ...action, background: '#26262B', color: INK }}>
                Back to home
              </Link>
            </div>
          </section>
        </main>
      </body>
    </html>
  )
}
