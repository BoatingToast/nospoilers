export type PlotPassportLevel = 'safe' | 'mid' | 'ending'

export const PLOT_PASSPORT_LEVELS: PlotPassportLevel[] = ['safe', 'mid', 'ending']

const MID_MOVIE_PATTERNS = [
  /\b(?:scene|character|relationship|betrays?|discovers?|reveals?|fight|battle|escape)\b/i,
  /\b(?:first half|halfway|midpoint|act two|after they|when (?:he|she|they|it))\b/i,
]

const ENDING_PATTERNS = [
  /\b(?:ending|finale|final scene|last scene|post[ -]?credits?|mid[ -]?credits?)\b/i,
  /\b(?:dies?|dead|death|killed?|murders?|murdered|survives?)\b/i,
  /\b(?:plot twist|twist ending|ending explained|big reveal|secret identity)\b/i,
  /\b(?:the (?:killer|villain|traitor) is|turns out (?:to be|that)|is revealed as)\b/i,
]

export function normalizeProgress(value: unknown): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0
  return Math.max(0, Math.min(100, Math.round(numeric)))
}

export function progressForStatus(status: string, currentProgress = 0): number {
  if (status === 'watched') return 100
  if (status === 'want_to_watch') return 0
  if (status === 'watching') {
    const current = normalizeProgress(currentProgress)
    return current > 0 && current < 100 ? current : 50
  }
  return normalizeProgress(currentProgress)
}

export function statusForProgress(progress: number): 'want_to_watch' | 'watching' | 'watched' {
  const normalized = normalizeProgress(progress)
  if (normalized === 0) return 'want_to_watch'
  if (normalized === 100) return 'watched'
  return 'watching'
}

export function clearanceForProgress(progress: number): PlotPassportLevel {
  const normalized = normalizeProgress(progress)
  if (normalized >= 100) return 'ending'
  if (normalized >= 50) return 'mid'
  return 'safe'
}

export function requiredProgressForLevel(level: string): number {
  if (level === 'ending') return 100
  if (level === 'mid' || level === 'theory') return 50
  return 0
}

export function canViewSpoilerLevel(level: string, progress: number): boolean {
  return normalizeProgress(progress) >= requiredProgressForLevel(level)
}

export function classifySpoilerBoundary(
  text: string,
  requestedLevel?: unknown,
  markedAsSpoiler = false,
): PlotPassportLevel {
  const normalizedText = String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, 10000)
  const detected: PlotPassportLevel = ENDING_PATTERNS.some(pattern => pattern.test(normalizedText))
    ? 'ending'
    : MID_MOVIE_PATTERNS.some(pattern => pattern.test(normalizedText))
      ? 'mid'
      : markedAsSpoiler
        ? 'ending'
        : 'safe'

  const requested = PLOT_PASSPORT_LEVELS.includes(requestedLevel as PlotPassportLevel)
    ? requestedLevel as PlotPassportLevel
    : 'safe'
  const rank: Record<PlotPassportLevel, number> = { safe: 0, mid: 1, ending: 2 }
  return rank[detected] >= rank[requested] ? detected : requested
}

export function passportLevelLabel(level: string): string {
  if (level === 'ending') return 'After finishing'
  if (level === 'mid' || level === 'theory') return 'After halfway'
  return 'Safe for everyone'
}
