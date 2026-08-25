import { ImageResponse } from 'next/og'
import { prisma } from '@/lib/db'
import { getPersonalityBySlug } from '@/services/personality'
import { THEME } from '@/lib/theme'

export const runtime = 'nodejs'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params

  const user = await prisma.user.findUnique({
    where:  { username },
    select: {
      username:         true,
      personality:      { select: { primaryType: true } },
      tasteProfile:     true,
      onboardingMovies: {
        select:  { title: true },
        orderBy: { addedAt: 'asc' },
        take:    3,
      },
      topFiveMovies: {
        select:  { title: true },
        orderBy: { position: 'asc' },
        take:    3,
      },
    },
  })

  if (!user) {
    return new Response('Not found', { status: 404 })
  }

  const personality = user.personality
    ? getPersonalityBySlug(user.personality.primaryType)
    : null
  const favoriteMovies = user.topFiveMovies.length > 0
    ? user.topFiveMovies
    : user.onboardingMovies

  const tp = user.tasteProfile
  const topTraits: { label: string; value: number }[] = tp
    ? [
        { label: 'Complexity',       value: tp.complexityScore },
        { label: 'Emotional Depth',  value: tp.emotionalImpactScore },
        { label: 'Suspense',         value: tp.suspenseScore },
        { label: 'Darkness',         value: tp.darknessScore },
        { label: 'Action',           value: tp.actionScore },
      ].sort((a, b) => b.value - a.value).slice(0, 3)
    : []

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          background: `linear-gradient(135deg, ${THEME.bg} 0%, ${THEME.surface} 50%, ${THEME.surface2} 100%)`,
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background accent */}
        <div style={{
          position: 'absolute',
          top: '-100px', right: '-100px',
          width: '400px', height: '400px',
          borderRadius: '50%',
          background: personality?.accentHex
            ? `radial-gradient(circle, ${personality.accentHex}30 0%, transparent 70%)`
            : `radial-gradient(circle, ${THEME.secondary}30 0%, transparent 70%)`,
        }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '48px 64px 0' }}>
          <span style={{ fontSize: '22px', letterSpacing: '0.3em', color: THEME.secondary, fontWeight: 700 }}>
            NOSPOILERS
          </span>
          <span style={{ fontSize: '14px', color: THEME.muted, letterSpacing: '0.1em' }}>
            MOVIE TASTE CARD
          </span>
        </div>

        {/* Main content */}
        <div style={{ display: 'flex', flex: 1, padding: '40px 64px 48px', gap: '64px', alignItems: 'center' }}>
          {/* Left: identity */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ fontSize: '64px', marginBottom: '8px', color: personality?.accentHex ?? THEME.secondary, fontWeight: 900, letterSpacing: '0.05em' }}>
              {(personality?.name ?? 'Film').charAt(0).toUpperCase()}
            </div>
            <div style={{ fontSize: '20px', color: THEME.muted, letterSpacing: '0.2em', marginBottom: '8px', textTransform: 'uppercase' }}>
              @{user.username}
            </div>
            <div style={{ fontSize: '48px', fontWeight: 900, color: THEME.text, lineHeight: 1.1, marginBottom: '16px' }}>
              {personality?.name ?? 'Film Lover'}
            </div>
            <div style={{ fontSize: '16px', color: THEME.muted, lineHeight: 1.5, maxWidth: '380px' }}>
              {personality?.description ?? 'A true lover of cinema.'}
            </div>

            {/* Personality traits */}
            {personality && (
              <div style={{ display: 'flex', gap: '10px', marginTop: '24px', flexWrap: 'wrap' }}>
                {personality.traits.map(trait => (
                  <span key={trait} style={{
                    background: THEME.border,
                    border: `1px solid ${personality.accentHex}40`,
                    color: personality.accentHex,
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}>
                    {trait}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Right: stats */}
          <div style={{ display: 'flex', flexDirection: 'column', width: '320px', gap: '20px' }}>
            {/* Top movies */}
            {favoriteMovies.length > 0 && (
              <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: '16px', padding: '20px' }}>
                <div style={{ fontSize: '11px', color: THEME.muted, letterSpacing: '0.2em', marginBottom: '12px' }}>
                  FAVORITE FILMS
                </div>
                {favoriteMovies.map((m, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ color: THEME.secondary, fontSize: '12px', width: '14px' }}>{i + 1}</span>
                    <span style={{ color: THEME.text, fontSize: '14px' }}>{m.title}</span>
                  </div>
                ))}
              </div>
            )}

            {/* DNA highlights */}
            {topTraits.length > 0 && (
              <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: '16px', padding: '20px' }}>
                <div style={{ fontSize: '11px', color: THEME.muted, letterSpacing: '0.2em', marginBottom: '12px' }}>
                  MOVIE DNA
                </div>
                {topTraits.map(trait => (
                  <div key={trait.label} style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: THEME.text, fontSize: '12px' }}>{trait.label}</span>
                      <span style={{ color: THEME.secondary, fontSize: '12px', fontWeight: 700 }}>
                        {Math.round(trait.value * 10)}%
                      </span>
                    </div>
                    <div style={{ height: '4px', background: THEME.border, borderRadius: '2px' }}>
                      <div style={{
                        height: '4px',
                        width: `${trait.value * 10}%`,
                        background: personality?.accentHex ?? THEME.secondary,
                        borderRadius: '2px',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '0 64px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: THEME.muted }}>nospoilers.app</span>
          <span style={{ fontSize: '13px', color: THEME.muted }}>Discover your Movie DNA</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
