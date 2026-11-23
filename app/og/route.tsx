import { ImageResponse } from 'next/og'
import { THEME } from '@/lib/theme'

export const dynamic = 'force-static'

export function GET() {
  return new ImageResponse(
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%', height: '100%', padding: '64px 72px', background: `radial-gradient(90% 80% at 50% 0%, ${THEME.secondary}55 0%, ${THEME.bg} 72%)`, color: THEME.text, fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', fontSize: 38, fontWeight: 700 }}>
        <span>No</span>
        <span style={{ marginLeft: 6, padding: '2px 12px', borderRadius: 10, background: THEME.secondary, color: THEME.secondaryForeground }}>Spoilers</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', fontSize: 80, fontWeight: 700, letterSpacing: -3, lineHeight: 1.06 }}>
        <div style={{ display: 'flex' }}>Your next favorite movie.</div>
        <div style={{ display: 'flex', color: THEME.muted }}>Without the spoilers.</div>
      </div>
      <div style={{ display: 'flex', fontSize: 27, color: THEME.muted }}>Movie recommendations • Movie DNA • Watchlists</div>
    </div>,
    { width: 1200, height: 630 },
  )
}
