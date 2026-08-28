export type TasteImportSource = 'letterboxd' | 'imdb'
export type TasteImportMatchStatus = 'matched' | 'conflict' | 'unmatched'

export interface ParsedTasteItem {
  rowKey: string
  source: TasteImportSource
  title: string
  year: number | null
  tmdbId: number | null
  imdbId: string | null
  ratingScore: number | null
  watched: boolean
  watchlist: boolean
  watchedDate: string | null
  rewatch: boolean
  review: string | null
}

export interface ImportMovieCandidate {
  tmdbId: number
  title: string
  year: number | null
  posterPath: string | null
  releaseDate: string | null
  genreIds: number[]
  runtime: number | null
  voteAverage: number | null
}

export interface TasteImportPreviewItem extends ParsedTasteItem {
  status: TasteImportMatchStatus
  confidence: 'exact' | 'likely' | 'none'
  candidates: ImportMovieCandidate[]
  selectedTmdbId: number | null
  existing: {
    rating: boolean
    watchlist: boolean
  }
}

export interface TasteImportPayload {
  version: 1
  items: TasteImportPreviewItem[]
  committedSelections?: Array<{ rowKey: string; tmdbId: number }>
}

export interface TasteImportHistoryItem {
  id: string
  source: TasteImportSource
  fileName: string
  status: string
  totalRows: number
  matchedRows: number
  conflictRows: number
  unmatchedRows: number
  summary: {
    imported?: number
    ratings?: number
    watched?: number
    watchlist?: number
    reviews?: number
  } | null
  createdAt: string
  completedAt: string | null
}
