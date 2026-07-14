import JSZip from 'jszip'
import { parse } from 'csv-parse/sync'
import type { ParsedTasteItem, TasteImportSource } from './types'

const MAX_ARCHIVE_FILES = 20
const MAX_UNCOMPRESSED_BYTES = 25 * 1024 * 1024
const MAX_ITEMS = 500

type CsvRow = Record<string, string>

interface CsvInput {
  name: string
  text: string
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/^\uFEFF/, '').replace(/[^a-z0-9]+/g, '')
}

function normalizeTitle(value: string): string {
  return value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim()
}

function rowValue(row: CsvRow, ...names: string[]): string {
  const normalized = new Map(Object.entries(row).map(([key, value]) => [normalizeHeader(key), String(value ?? '').trim()]))
  for (const name of names) {
    const value = normalized.get(normalizeHeader(name))
    if (value) return value
  }
  return ''
}

function parseYear(value: string): number | null {
  const match = String(value).match(/(?:19|20)\d{2}/)
  if (!match) return null
  const year = Number(match[0])
  return year >= 1880 && year <= 2200 ? year : null
}

function parseDate(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function truthy(value: string): boolean {
  return /^(?:1|true|yes|y)$/i.test(value.trim())
}

function scoreFromRow(row: CsvRow): number | null {
  const rating100 = Number(rowValue(row, 'rating100', 'score100'))
  if (Number.isFinite(rating100) && rating100 > 0) return Math.min(100, Math.round(rating100))

  const rating10 = Number(rowValue(row, 'rating10', 'your rating', 'yourrating'))
  if (Number.isFinite(rating10) && rating10 > 0) return Math.min(100, Math.round(rating10 * 10))

  const raw = Number(rowValue(row, 'rating'))
  if (!Number.isFinite(raw) || raw <= 0) return null
  if (raw <= 5) return Math.round(raw * 20)
  if (raw <= 10) return Math.round(raw * 10)
  return Math.min(100, Math.round(raw))
}

function detectSource(name: string, rows: CsvRow[], requested?: TasteImportSource): TasteImportSource {
  if (requested) return requested
  const headers = Object.keys(rows[0] ?? {}).map(normalizeHeader)
  if (headers.includes('const') || headers.includes('tconst') || headers.includes('yourrating')) return 'imdb'
  if (name.toLowerCase().includes('imdb')) return 'imdb'
  return 'letterboxd'
}

function fileSemantics(name: string, row: CsvRow): { watched: boolean; watchlist: boolean } {
  const lower = name.toLowerCase()
  const status = rowValue(row, 'status', 'list').toLowerCase()
  const watchlist = lower.includes('watchlist') || /watchlist|want.to.watch/.test(status)
  const watched = !watchlist && (
    lower.includes('watched') || lower.includes('diary') || lower.includes('rating') ||
    lower.includes('review') || /watched|seen|completed/.test(status) ||
    !!rowValue(row, 'watched date', 'date rated') || scoreFromRow(row) !== null
  )
  return { watched, watchlist }
}

function parseCsv(input: CsvInput, requested?: TasteImportSource): { source: TasteImportSource; items: ParsedTasteItem[]; rows: number } {
  const rows = parse(input.text, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    relax_quotes: true,
    trim: true,
  }) as CsvRow[]
  const source = detectSource(input.name, rows, requested)
  const items: ParsedTasteItem[] = []

  rows.forEach((row, index) => {
    const title = rowValue(row, 'name', 'title', 'original title')
    if (!title) return

    const year = parseYear(rowValue(row, 'year', 'title year', 'release year'))
    const tmdbRaw = Number(rowValue(row, 'tmdbID', 'tmdb id', 'tmdb'))
    const imdbRaw = rowValue(row, 'const', 'tconst', 'imdbID', 'imdb id')
    const imdbId = /^tt\d+$/i.test(imdbRaw) ? imdbRaw.toLowerCase() : null
    const externalRef = rowValue(row, 'letterboxd uri', 'letterboxdurl', 'url')
    const semantics = fileSemantics(input.name, row)
    const watchedDate = parseDate(rowValue(row, 'watched date', 'date rated'))
    const review = rowValue(row, 'review', 'notes', 'description').slice(0, 10000) || null
    const identity = Number.isInteger(tmdbRaw) && tmdbRaw > 0
      ? `tmdb:${tmdbRaw}`
      : imdbId
        ? `imdb:${imdbId}`
        : externalRef
          ? `external:${externalRef.toLowerCase()}`
          : `title:${normalizeTitle(title)}:${year ?? 'unknown'}`

    items.push({
      rowKey: identity || `${input.name}:${index}`,
      source,
      title: title.slice(0, 300),
      year,
      tmdbId: Number.isInteger(tmdbRaw) && tmdbRaw > 0 ? tmdbRaw : null,
      imdbId,
      ratingScore: scoreFromRow(row),
      watched: semantics.watched,
      watchlist: semantics.watchlist,
      watchedDate,
      rewatch: truthy(rowValue(row, 'rewatch')),
      review,
    })
  })

  return { source, items, rows: rows.length }
}

function mergeItems(items: ParsedTasteItem[]): ParsedTasteItem[] {
  const merged = new Map<string, ParsedTasteItem>()
  for (const item of items) {
    const current = merged.get(item.rowKey)
    if (!current) {
      merged.set(item.rowKey, item)
      continue
    }
    merged.set(item.rowKey, {
      ...current,
      tmdbId: item.tmdbId ?? current.tmdbId,
      imdbId: item.imdbId ?? current.imdbId,
      ratingScore: item.ratingScore ?? current.ratingScore,
      watched: current.watched || item.watched,
      watchlist: current.watchlist || item.watchlist,
      watchedDate: item.watchedDate ?? current.watchedDate,
      rewatch: current.rewatch || item.rewatch,
      review: item.review ?? current.review,
    })
  }
  return [...merged.values()]
}

async function csvInputsFromFile(buffer: Buffer, fileName: string): Promise<CsvInput[]> {
  if (fileName.toLowerCase().endsWith('.csv')) {
    return [{ name: fileName, text: buffer.toString('utf8') }]
  }
  if (!fileName.toLowerCase().endsWith('.zip')) {
    throw new Error('Upload a CSV file or a Letterboxd ZIP export.')
  }

  const zip = await JSZip.loadAsync(buffer)
  const entries = Object.values(zip.files)
    .filter(entry => !entry.dir && entry.name.toLowerCase().endsWith('.csv') && !entry.name.includes('__MACOSX'))
    .slice(0, MAX_ARCHIVE_FILES)
  if (entries.length === 0) throw new Error('The ZIP does not contain any CSV files.')

  let totalBytes = 0
  const inputs: CsvInput[] = []
  for (const entry of entries) {
    const bytes = await entry.async('uint8array')
    totalBytes += bytes.byteLength
    if (totalBytes > MAX_UNCOMPRESSED_BYTES) throw new Error('The uncompressed CSV data is too large (25 MB maximum).')
    inputs.push({ name: entry.name, text: new TextDecoder().decode(bytes) })
  }
  return inputs
}

export async function parseTasteImport(
  buffer: Buffer,
  fileName: string,
  requestedSource?: TasteImportSource,
): Promise<{ source: TasteImportSource; items: ParsedTasteItem[]; totalRows: number }> {
  const inputs = await csvInputsFromFile(buffer, fileName)
  const parsed = inputs.map(input => parseCsv(input, requestedSource))
  const items = mergeItems(parsed.flatMap(result => result.items))
  if (items.length === 0) throw new Error('No movie rows were found in this export.')
  if (items.length > MAX_ITEMS) {
    throw new Error(`This import contains ${items.length} unique movies. Import up to ${MAX_ITEMS} at a time.`)
  }
  const source = requestedSource ?? parsed.find(result => result.items.length > 0)?.source ?? 'letterboxd'
  return {
    source,
    items: items.map(item => ({ ...item, source })),
    totalRows: parsed.reduce((sum, result) => sum + result.rows, 0),
  }
}
