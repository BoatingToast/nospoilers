export type MovieNightOutcomeVote = 'watch' | 'maybe' | 'pass'

export interface MovieNightOutcomeCandidate {
  id: string
  position: number
  groupFit: number
  votes: { value: MovieNightOutcomeVote | string }[]
}

export type MovieNightOutcome =
  | { status: 'matched'; matchedCandidateId: string }
  | { status: 'no_match'; matchedCandidateId: null }
  | null

/**
 * Resolve a completed Movie Night ballot without exposing individual choices.
 * A unanimous Watch ends the ballot early; a completed all-Pass ballot has no
 * winner; otherwise Watch/Maybe votes determine the best consensus result.
 */
export function decideMovieNightOutcome(
  candidates: MovieNightOutcomeCandidate[],
  participantCount: number,
): MovieNightOutcome {
  if (participantCount < 2 || candidates.length === 0) return null

  const unanimous = candidates.find(candidate =>
    candidate.votes.filter(vote => vote.value === 'watch').length === participantCount,
  )
  if (unanimous) return { status: 'matched', matchedCandidateId: unanimous.id }

  const allFinished = candidates.every(candidate => candidate.votes.length === participantCount)
  if (!allFinished) return null

  const hasPositiveVote = candidates.some(candidate =>
    candidate.votes.some(vote => vote.value === 'watch' || vote.value === 'maybe'),
  )
  if (!hasPositiveVote) return { status: 'no_match', matchedCandidateId: null }

  const score = (candidate: MovieNightOutcomeCandidate) => candidate.votes.reduce((total, vote) => {
    if (vote.value === 'watch') return total + 2
    if (vote.value === 'maybe') return total + 1
    return total
  }, candidate.groupFit / 100)

  const best = [...candidates].sort((a, b) =>
    score(b) - score(a) || a.position - b.position,
  )[0]

  return best ? { status: 'matched', matchedCandidateId: best.id } : null
}
