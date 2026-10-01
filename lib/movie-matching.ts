export interface MovieMatchCandidate {
  id: number
  title: string
  release_date?: string | null
  popularity?: number
}

function normalizedTitle(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function candidateYear(candidate: MovieMatchCandidate) {
  const year = Number.parseInt(candidate.release_date?.slice(0, 4) ?? '', 10)
  return Number.isInteger(year) ? year : null
}

/**
 * Only accepts exact normalized title matches. TMDB search order/popularity is
 * used to break ties unless a release year gives us an exact remake match.
 */
export function selectAutomaticMovieMatch<T extends MovieMatchCandidate>(
  title: string,
  releaseYear: number | null,
  candidates: T[],
): T | null {
  const wantedTitle = normalizedTitle(title)
  if (!wantedTitle) return null

  const exactTitleMatches = candidates.filter(candidate => (
    normalizedTitle(candidate.title) === wantedTitle
  ))
  if (exactTitleMatches.length === 0) return null

  if (releaseYear !== null) {
    const exactYearMatches = exactTitleMatches.filter(candidate => candidateYear(candidate) === releaseYear)
    if (exactYearMatches.length > 0) {
      return [...exactYearMatches].sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))[0]
    }

    // A supplied year that disagrees is a strong signal that this is not the
    // catalog movie (often it is a creator's original film with the same name).
    return null
  }

  return [...exactTitleMatches].sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))[0]
}
