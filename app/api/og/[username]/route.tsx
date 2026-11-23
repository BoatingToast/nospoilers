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
        { label: 'Complexity', value: tp.complexityScore },
        { label: 'Emotional Depth', value: tp.emotionalImpactScore },
        { label: 'Suspense', value: tp.suspenseScore },
        { label: 'Darkness', value: tp.darknessScore },
        { label: 'Action', value: tp.actionScore },
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
          background: THEME.bg,
          color: THEME.text,
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '48px 64px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: '28px', fontWeight: 700 }}>
            <span>No</span>
            <span style={{ marginLeft: '5px', padding: '2px 9px', borderRadius: '8px', background: THEME.secondary, color: THEME.secondaryForeground }}>Spoilers</span>
          </div>
          <span style={{ fontSize: '18px', color: THEME.muted }}>
            Movie taste card
          </span>
        </div>

        {/* Main content */}
        <div style={{ display: 'flex', flex: 1, padding: '40px 64px 48px', gap: '64px', alignItems: 'center' }}>
          {/* Left: identity */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ fontSize: '24px', color: THEME.muted, marginBottom: '10px' }}>
              {`@${user.username}`}
            </div>
            <div style={{ fontSize: '68px', fontWeight: 800, letterSpacing: '-2px', color: THEME.text, lineHeight: 1.04, marginBottom: '18px' }}>
              {personality?.name ?? 'Film Lover'}
            </div>
            <div style={{ fontSize: '20px', color: THEME.muted, lineHeight: 1.5, maxWidth: '460px' }}>
              {personality?.description ?? 'A true lover of cinema.'}
            </div>

            {/* Personality traits */}
            {personality && (
              <div style={{ display: 'flex', gap: '10px', marginTop: '24px', flexWrap: 'wrap' }}>
                {personality.traits.map(trait => (
                  <span key={trait} style={{
                    background: THEME.surface2,
                    color: personality.accentHex,
                    padding: '7px 15px',
                    borderRadius: '999px',
                    fontSize: '15px',
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
              <div style={{ display: 'flex', flexDirection: 'column', background: THEME.surface, borderRadius: '24px', padding: '22px' }}>
                <div style={{ fontSize: '16px', fontWeight: 700, color: THEME.text, marginBottom: '12px' }}>
                  Favorite films
                </div>
                {favoriteMovies.map((m, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ color: THEME.secondary, fontSize: '15px', width: '16px' }}>{i + 1}</span>
                    <span style={{ color: THEME.text, fontSize: '16px' }}>{m.title}</span>
                  </div>
                ))}
              </div>
            )}

            {/* DNA highlights */}
            {topTraits.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', background: THEME.surface, borderRadius: '24px', padding: '22px' }}>
                <div style={{ fontSize: '16px', fontWeight: 700, color: THEME.text, marginBottom: '12px' }}>
                  Movie DNA
                </div>
                {topTraits.map(trait => (
                  <div key={trait.label} style={{ display: 'flex', flexDirection: 'column', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span style={{ color: THEME.text, fontSize: '15px' }}>{trait.label}</span>
                      <span style={{ color: THEME.secondary, fontSize: '15px', fontWeight: 700 }}>
                        {`${Math.round(trait.value * 10)}%`}
                      </span>
                    </div>
                    <div style={{ display: 'flex', height: '6px', background: THEME.surface2, borderRadius: '3px' }}>
                      <div style={{
                        height: '6px',
                        width: `${trait.value * 10}%`,
                        background: personality?.accentHex ?? THEME.secondary,
                        borderRadius: '3px',
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
          <span style={{ fontSize: '16px', color: THEME.muted }}>nospoilers.xyz</span>
          <span style={{ fontSize: '16px', color: THEME.muted }}>Discover your Movie DNA</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
