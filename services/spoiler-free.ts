import type { TMDbMovieDetail } from '@/types'

const SAFE_FALLBACK = 'A film worth discovering on your own terms.'
const MAX_SAFE_SENTENCES = 2
const MAX_SAFE_CHARACTERS = 220
const MIN_SAFE_FRAGMENT = 48

// These are deliberately conservative. NoSpoilers should occasionally show a
// shorter premise rather than accidentally preserve an outcome or reveal.
const REVEAL_PATTERNS = [
  /\b(?:reveals?|discovers?|learns?|realizes?|uncovers?|finds? out)\b/i,
  /\bturns? out\b/i,
  /\b(?:is|was|are|were) actually\b/i,
  /\bsecretly\b/i,
  /\b(?:true|hidden|secret) identity\b/i,
  /\b(?:plot )?twist\b/i,
  /\bsurprise ending\b/i,
]

const OUTCOME_PATTERNS = [
  /\b(?:in the end|by the end|at the end|ultimately|eventually|finally)\b/i,
  /\b(?:dies?|dead|death of|is killed|was killed|murdered|sacrifices? (?:himself|herself|themselves))\b/i,
  /\b(?:defeats?|survives?|escapes?|wins?|loses?|returns? home|reunites?)\b/i,
  /\b(?:final showdown|climax|ending)\b/i,
]

const LATE_STORY_PIVOTS = [
  /\b(?:however|meanwhile|but then|only to|until|leading to)\b/i,
  /\b(?:forcing|leaving) (?:him|her|them) to\b/i,
]

function earliestMatch(text: string, patterns: RegExp[]): number | null {
  let earliest = Infinity
  for (const pattern of patterns) {
    const match = pattern.exec(text)
    if (match?.index !== undefined) earliest = Math.min(earliest, match.index)
  }
  return earliest === Infinity ? null : earliest
}

function wordAlignedLimit(text: string, limit: number): string {
  if (text.length <= limit) return text
  const slice = text.slice(0, limit + 1)
  const lastSpace = slice.lastIndexOf(' ')
  const cutAt = lastSpace >= MIN_SAFE_FRAGMENT ? lastSpace : limit
  return `${slice.slice(0, cutAt).replace(/[\s,;:–—-]+$/, '')}…`
}

function finishFragment(text: string, wasCut: boolean): string {
  const clean = text.trim().replace(/[\s,;:–—-]+$/, '')
  if (!clean) return ''
  if (wasCut) return `${clean}…`
  return /[.!?…]$/.test(clean) ? clean : `${clean}.`
}

/**
 * Extracts a conservative premise from a third-party synopsis.
 *
 * It never falls back to copying an unsafe raw prefix: if reveal language
 * appears before a useful premise can be formed, the generic fallback wins.
 */
export function makeSpoilerFree(overview: string | null | undefined): string {
  const normalized = overview?.replace(/\s+/g, ' ').trim()
  if (!normalized) return SAFE_FALLBACK

  const sentences = normalized.split(/(?<=[.!?])\s+/)
  const safeParts: string[] = []

  for (const [index, sentence] of sentences.slice(0, MAX_SAFE_SENTENCES).entries()) {
    const revealAt = earliestMatch(sentence, [...REVEAL_PATTERNS, ...OUTCOME_PATTERNS])
    const pivotAt = index > 0 ? earliestMatch(sentence, LATE_STORY_PIVOTS) : null
    const riskAt = Math.min(revealAt ?? Infinity, pivotAt ?? Infinity)

    if (riskAt !== Infinity) {
      // Once a complete safe sentence exists, do not borrow from a risky one.
      if (safeParts.length > 0) break

      const premise = sentence.slice(0, riskAt).trim()
      if (premise.length >= MIN_SAFE_FRAGMENT) {
        safeParts.push(finishFragment(premise, true))
      }
      break
    }

    const cleanSentence = finishFragment(sentence, false)
    if (!cleanSentence) continue
    const candidate = [...safeParts, cleanSentence].join(' ')

    if (candidate.length > MAX_SAFE_CHARACTERS) {
      if (safeParts.length === 0) safeParts.push(wordAlignedLimit(cleanSentence, MAX_SAFE_CHARACTERS))
      break
    }

    safeParts.push(cleanSentence)
  }

  const safe = wordAlignedLimit(safeParts.join(' '), MAX_SAFE_CHARACTERS)
  return safe.length >= MIN_SAFE_FRAGMENT ? safe : SAFE_FALLBACK
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
