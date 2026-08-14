export const MOVIE_UPLOAD_BUCKET = 'movie-uploads'

export const MAX_MOVIE_BYTES = 1024 * 1024 * 1024 // 1 GB
export const MAX_PENDING_MOVIE_UPLOADS = 2
export const MAX_MOVIE_TITLE_LENGTH = 120
export const MAX_MOVIE_DESCRIPTION_LENGTH = 1000
export const MAX_MOVIE_WATCH_PROVIDERS = 8
export const MAX_MOVIE_PROVIDER_NAME_LENGTH = 60

export type MovieWatchProviderSource = 'creator' | 'tmdb'
export type MovieWatchAccessType = 'stream' | 'free' | 'ads' | 'rent' | 'buy'

export interface MovieWatchProvider {
  name: string
  url: string
  source?: MovieWatchProviderSource
  providerId?: number
  logoPath?: string | null
  accessTypes?: MovieWatchAccessType[]
}

export interface MovieWatchAvailability {
  region: string
  link: string
  providers: MovieWatchProvider[]
}

export interface MovieWatchProviderValidation {
  providers: MovieWatchProvider[]
  error: string | null
}

export const MOVIE_WATCH_REGIONS = [
  { code: 'US', label: 'United States' },
  { code: 'CA', label: 'Canada' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'AU', label: 'Australia' },
] as const

export const MOVIE_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-m4v',
] as const

const MIME_EXTENSION: Record<(typeof MOVIE_MIME_TYPES)[number], string> = {
  'video/mp4':       'mp4',
  'video/webm':      'webm',
  'video/quicktime': 'mov',
  'video/x-m4v':     'm4v',
}

const FILE_EXTENSION_MIME: Record<string, (typeof MOVIE_MIME_TYPES)[number]> = {
  mp4:  'video/mp4',
  webm: 'video/webm',
  mov:  'video/quicktime',
  m4v:  'video/x-m4v',
}

export function normalizeMovieMimeType(mimeType: string, fileName: string) {
  if (MOVIE_MIME_TYPES.includes(mimeType as (typeof MOVIE_MIME_TYPES)[number])) {
    return mimeType as (typeof MOVIE_MIME_TYPES)[number]
  }

  const extension = fileName.split('.').pop()?.toLowerCase() ?? ''
  return FILE_EXTENSION_MIME[extension] ?? null
}

export function movieExtensionForMimeType(mimeType: string) {
  return MIME_EXTENSION[mimeType as (typeof MOVIE_MIME_TYPES)[number]] ?? null
}

/**
 * Browser-provided MIME types and extensions are untrusted. Check the file's
 * container signature before moving an upload into the ready state.
 */
export function hasValidMovieSignature(bytes: Uint8Array, mimeType: string): boolean {
  if (mimeType === 'video/webm') {
    return bytes.length >= 4 &&
      bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3
  }

  if (mimeType === 'video/mp4' || mimeType === 'video/quicktime' || mimeType === 'video/x-m4v') {
    return bytes.length >= 8 &&
      bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70
  }

  return false
}

export function formatMovieFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export function isMovieWatchRegion(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Z]{2}$/.test(value)
}

/**
 * Validates creator-supplied watch links before they are stored or rendered.
 * Empty rows are ignored so the entire feature remains optional.
 */
export function normalizeMovieWatchProviders(value: unknown): MovieWatchProviderValidation {
  if (value === undefined || value === null) return { providers: [], error: null }
  if (!Array.isArray(value)) return { providers: [], error: 'Watch providers must be a list' }
  if (value.length > MAX_MOVIE_WATCH_PROVIDERS) {
    return { providers: [], error: `Add no more than ${MAX_MOVIE_WATCH_PROVIDERS} watch providers` }
  }

  const providers: MovieWatchProvider[] = []
  const seen = new Set<string>()

  for (const item of value) {
    if (!item || typeof item !== 'object') {
      return { providers: [], error: 'Each watch provider needs a name and link' }
    }

    const record = item as Record<string, unknown>
    const name = typeof record.name === 'string' ? record.name.trim() : ''
    const rawUrl = typeof record.url === 'string' ? record.url.trim() : ''

    if (!name && !rawUrl) continue
    if (!name || !rawUrl) {
      return { providers: [], error: 'Add both a platform name and watch link' }
    }
    if (name.length > MAX_MOVIE_PROVIDER_NAME_LENGTH) {
      return {
        providers: [],
        error: `Platform names must be ${MAX_MOVIE_PROVIDER_NAME_LENGTH} characters or fewer`,
      }
    }

    let url: URL
    try {
      url = new URL(rawUrl)
    } catch {
      return { providers: [], error: `Add a valid link for ${name}` }
    }

    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return { providers: [], error: `The link for ${name} must start with http:// or https://` }
    }

    const normalized: MovieWatchProvider = {
      name,
      url: url.toString(),
      source: 'creator',
      accessTypes: [],
    }
    const key = normalized.name.toLowerCase()
    if (!seen.has(key)) {
      providers.push(normalized)
      seen.add(key)
    }
  }

  return { providers, error: null }
}

/** Creator links win over automatic entries with the same provider name. */
export function mergeMovieWatchProviders(
  automaticProviders: MovieWatchProvider[],
  creatorProviders: MovieWatchProvider[],
): MovieWatchProvider[] {
  const merged = [...automaticProviders]
  const indexByName = new Map(
    merged.map((provider, index) => [provider.name.toLowerCase(), index]),
  )

  for (const provider of creatorProviders) {
    const key = provider.name.toLowerCase()
    const existingIndex = indexByName.get(key)
    if (existingIndex === undefined) {
      indexByName.set(key, merged.length)
      merged.push(provider)
    } else {
      merged[existingIndex] = provider
    }
  }

  return merged
}
