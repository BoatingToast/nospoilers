import { ImageResponse } from 'next/og'
import { THEME } from '@/lib/theme'

export const dynamic = 'force-static'

export function GET() {
  return new ImageResponse(
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%', height: '100%', padding: '64px 72px', background: THEME.bg, color: THEME.text, fontFamily: 'sans-serif', borderTop: `12px solid ${THEME.secondary}` }}>
      <div style={{ display: 'flex', fontSize: 30, letterSpacing: 5, color: THEME.muted }}>NOSPOILERS</div>
      <div style={{ display: 'flex', flexDirection: 'column', fontSize: 72, fontWeight: 700, letterSpacing: -2, lineHeight: 1.1 }}>
        <div style={{ display: 'flex' }}>Your next favorite movie.</div>
        <div style={{ display: 'flex', color: THEME.muted }}>Without the spoilers.</div>
      </div>
      <div style={{ display: 'flex', fontSize: 25, color: THEME.muted }}>Movie recommendations • Movie DNA • Watchlists</div>
    </div>,
    { width: 1200, height: 630 },
  )
}
