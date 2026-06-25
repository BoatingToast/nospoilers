import type { TMDbMovieDetail } from '@/types'

// ─── Spoiler marker patterns ──────────────────────────────────────────────────
const SPOILER_MARKERS = [
  'reveals that', 'reveals ', 'discovers that', 'discovers ',
  'turns out', 'in the end', 'ultimately,', 'but when ',
  'only to find', 'only to discover', 'learns that', 'finds out',
  'uncovers', 'plot twist', 'betrayal', 'is actually',
  'who is actually', 'surprise ending', 'hidden identity',
  'realizes that', 'finally understands',
]

/**
 * Trims a TMDb overview to a spoiler-free premise description.
 * Takes the first 1–2 sentences, then cuts before any spoiler phrase.
 */
export function makeSpoilerFree(overview: string | null | undefined): string {
  if (!overview?.trim()) return 'A film worth discovering on your own terms.'

  // Split on sentence boundaries
  const sentences = overview.split(/(?<=[.!?])\s+/)
  let safe = ''

  for (const sentence of sentences.slice(0, 3)) {
    const lower = sentence.toLowerCase()
    const hitIndex = SPOILER_MARKERS.reduce((min, marker) => {
      const idx = lower.indexOf(marker)
      return idx > -1 && idx < min ? idx : min
    }, Infinity)

    if (hitIndex < Infinity && safe.length > 40) break // cut before spoiler if we already have content
    if (hitIndex < Infinity) {
      // Take the part before the spoiler phrase
      const cut = sentence.slice(0, hitIndex).trim()
      if (cut) safe += (safe ? ' ' : '') + cut
      break
    }

    safe += (safe ? ' ' : '') + sentence.trim()
    if (safe.length > 200) break
  }

  if (!safe || safe.length < 20) {
    // Absolute fallback: first 150 characters, word-aligned
    const trimmed = overview.slice(0, 150)
    const lastSpace = trimmed.lastIndexOf(' ')
    safe = trimmed.slice(0, lastSpace > 40 ? lastSpace : 150).trim() + '...'
  }

  // Ensure it ends cleanly
  if (!safe.match(/[.!?…]$/)) safe = safe.replace(/[,;]$/, '') + '.'

  return safe
}

// ─── Audience profile ─────────────────────────────────────────────────────────

export function generateAudienceProfile(movie: TMDbMovieDetail): {
  wouldEnjoy: string[]
  mightNotEnjoy: string[]
} {
  const genres  = movie.genres.map(g => g.name.toLowerCase())
  const rating  = movie.vote_average
  const runtime = movie.runtime ?? 100

  const wouldEnjoy: string[]    = []
  const mightNotEnjoy: string[] = []

  if (genres.includes('drama'))           wouldEnjoy.push('fans of character-driven stories')
  if (genres.includes('thriller') || genres.includes('mystery'))
                                          wouldEnjoy.push('viewers who enjoy suspense and tension')
  if (genres.includes('science fiction')) wouldEnjoy.push('fans of intelligent science fiction')
  if (genres.includes('comedy'))          wouldEnjoy.push('viewers looking for a fun, witty watch')
  if (genres.includes('horror'))          wouldEnjoy.push('fans of atmospheric, unsettling cinema')
  if (genres.includes('action'))          wouldEnjoy.push('viewers who love kinetic, high-energy films')
  if (genres.includes('documentary'))     wouldEnjoy.push('people who enjoy learning through film')
  if (genres.includes('romance'))         wouldEnjoy.push('fans of emotional, heartfelt storytelling')
  if (genres.includes('animation'))       wouldEnjoy.push('fans of imaginative animated filmmaking')
  if (genres.includes('crime'))           wouldEnjoy.push('fans of moral complexity and intrigue')

  if (rating >= 8)   wouldEnjoy.push('cinephiles seeking acclaimed, highly-rated films')
  else if (rating >= 7.5) wouldEnjoy.push('viewers who appreciate critically recognized cinema')

  if (runtime > 150) {
    wouldEnjoy.push('viewers who enjoy immersive, epic experiences')
    mightNotEnjoy.push('those looking for a quick watch')
  }

  if (genres.includes('horror'))            mightNotEnjoy.push('viewers sensitive to disturbing content')
  if (!genres.includes('action'))           mightNotEnjoy.push('those seeking nonstop action')
  if (genres.includes('drama') && !genres.includes('comedy'))
                                            mightNotEnjoy.push('fans of purely lighthearted entertainment')
  if (genres.includes('documentary'))       mightNotEnjoy.push('those looking for narrative fiction')
  if (genres.includes('science fiction') && !genres.includes('action'))
                                            mightNotEnjoy.push('viewers who prefer grounded, realistic stories')

  return {
    wouldEnjoy:    wouldEnjoy.slice(0, 3),
    mightNotEnjoy: mightNotEnjoy.slice(0, 2),
  }
}
