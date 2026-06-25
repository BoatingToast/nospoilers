import { ImageResponse } from 'next/og'
import { prisma } from '@/lib/db'
import { getPersonalityBySlug } from '@/services/personality'

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
      onboardingMovies: { select: { title: true }, take: 3 },
    },
  })

  if (!user) {
    return new Response('Not found', { status: 404 })
  }

  const personality = user.personality
    ? getPersonalityBySlug(user.personality.primaryType)
    : null

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
          background: 'linear-gradient(135deg, #07070F 0%, #0C0C18 50%, #0F0F20 100%)',
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
            : 'radial-gradient(circle, #C8963E30 0%, transparent 70%)',
        }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '48px 64px 0' }}>
          <span style={{ fontSize: '22px', letterSpacing: '0.3em', color: '#C8963E', fontWeight: 700 }}>
            NOSPOILERS
          </span>
          <span style={{ fontSize: '14px', color: '#52506A', letterSpacing: '0.1em' }}>
            MOVIE TASTE CARD
          </span>
        </div>

        {/* Main content */}
        <div style={{ display: 'flex', flex: 1, padding: '40px 64px 48px', gap: '64px', alignItems: 'center' }}>
          {/* Left: identity */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ fontSize: '64px', marginBottom: '8px', color: personality?.accentHex ?? '#C8963E', fontWeight: 900, letterSpacing: '0.05em' }}>
              {(personality?.name ?? 'Film').charAt(0).toUpperCase()}
            </div>
            <div style={{ fontSize: '20px', color: '#52506A', letterSpacing: '0.2em', marginBottom: '8px', textTransform: 'uppercase' }}>
              @{user.username}
            </div>
            <div style={{ fontSize: '48px', fontWeight: 900, color: '#EDE9E1', lineHeight: 1.1, marginBottom: '16px' }}>
              {personality?.name ?? 'Film Lover'}
            </div>
            <div style={{ fontSize: '16px', color: '#8B8A9B', lineHeight: 1.5, maxWidth: '380px' }}>
              {personality?.description ?? 'A true lover of cinema.'}
            </div>

            {/* Personality traits */}
            {personality && (
              <div style={{ display: 'flex', gap: '10px', marginTop: '24px', flexWrap: 'wrap' }}>
                {personality.traits.map(trait => (
                  <span key={trait} style={{
                    background: '#1C1C2E',
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
            {user.onboardingMovies.length > 0 && (
              <div style={{ background: '#0C0C18', border: '1px solid #1C1C2E', borderRadius: '16px', padding: '20px' }}>
                <div style={{ fontSize: '11px', color: '#52506A', letterSpacing: '0.2em', marginBottom: '12px' }}>
                  FAVORITE FILMS
                </div>
                {user.onboardingMovies.map((m, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ color: '#C8963E', fontSize: '12px', width: '14px' }}>{i + 1}</span>
                    <span style={{ color: '#EDE9E1', fontSize: '14px' }}>{m.title}</span>
                  </div>
                ))}
              </div>
            )}

            {/* DNA highlights */}
            {topTraits.length > 0 && (
              <div style={{ background: '#0C0C18', border: '1px solid #1C1C2E', borderRadius: '16px', padding: '20px' }}>
                <div style={{ fontSize: '11px', color: '#52506A', letterSpacing: '0.2em', marginBottom: '12px' }}>
                  MOVIE DNA
                </div>
                {topTraits.map(trait => (
                  <div key={trait.label} style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: '#EDE9E1', fontSize: '12px' }}>{trait.label}</span>
                      <span style={{ color: '#C8963E', fontSize: '12px', fontWeight: 700 }}>
                        {Math.round(trait.value * 10)}%
                      </span>
                    </div>
                    <div style={{ height: '4px', background: '#1C1C2E', borderRadius: '2px' }}>
                      <div style={{
                        height: '4px',
                        width: `${trait.value * 10}%`,
                        background: personality?.accentHex ?? '#C8963E',
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
          <span style={{ fontSize: '13px', color: '#52506A' }}>nospoilers.app</span>
          <span style={{ fontSize: '13px', color: '#52506A' }}>Discover your Movie DNA</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
