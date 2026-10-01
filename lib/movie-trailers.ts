import type { TMDbVideo } from '@/types'

const YOUTUBE_KEY = /^[A-Za-z0-9_-]{6,20}$/
const PLAYABLE_TYPES = new Set(['Trailer', 'Teaser'])

function trailerScore(video: TMDbVideo): number {
  return (video.type === 'Trailer' ? 100 : 0)
    + (video.official ? 20 : 0)
    + (video.iso_639_1 === 'en' ? 5 : 0)
    + Math.min(video.size, 2160) / 2160
}

export function selectMovieTrailers(videos: TMDbVideo[], limit = 6): TMDbVideo[] {
  const seen = new Set<string>()

  return videos
    .filter(video =>
      video.site === 'YouTube'
      && PLAYABLE_TYPES.has(video.type)
      && YOUTUBE_KEY.test(video.key),
    )
    .sort((a, b) => {
      const scoreDifference = trailerScore(b) - trailerScore(a)
      if (scoreDifference !== 0) return scoreDifference
      return (Date.parse(b.published_at) || 0) - (Date.parse(a.published_at) || 0)
    })
    .filter(video => {
      if (seen.has(video.key)) return false
      seen.add(video.key)
      return true
    })
    .slice(0, Math.max(0, limit))
}
