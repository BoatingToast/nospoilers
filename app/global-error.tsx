'use client'

import Link from 'next/link'
import { useEffect } from 'react'

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
      <body style={{ margin: 0, background: '#050814', color: '#ede9e1', fontFamily: 'system-ui, sans-serif' }}>
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px', boxSizing: 'border-box' }}>
          <section
            role="alert"
            aria-labelledby="global-error-title"
            style={{ width: '100%', maxWidth: 520, padding: '40px 28px', boxSizing: 'border-box', textAlign: 'center', border: '1px solid #3f2443', borderRadius: 24, background: '#0b0f24' }}
          >
            <p style={{ margin: '0 0 10px', color: '#f87171', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              NoSpoilers hit a snag
            </p>
            <h1 id="global-error-title" style={{ margin: 0, fontSize: 28, lineHeight: 1.2 }}>
              The app could not start
            </h1>
            <p style={{ margin: '14px auto 0', maxWidth: 400, color: '#9498bd', fontSize: 14, lineHeight: 1.6 }}>
              Your data is safe. Try loading NoSpoilers again, or return home and start fresh.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 28 }}>
              <button
                type="button"
                onClick={reset}
                style={{ cursor: 'pointer', border: 0, borderRadius: 8, background: '#680dd1', color: '#fff', padding: '11px 20px', fontSize: 14, fontWeight: 600 }}
              >
                Try again
              </button>
              <Link href="/" style={{ border: '1px solid #1b2242', borderRadius: 8, color: '#ede9e1', padding: '10px 20px', fontSize: 14, textDecoration: 'none' }}>
                Back to home
              </Link>
            </div>
          </section>
        </main>
      </body>
    </html>
  )
}
