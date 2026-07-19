export const MOVIE_UPLOAD_BUCKET = 'movie-uploads'

export const MAX_MOVIE_BYTES = 1024 * 1024 * 1024 // 1 GB
export const MAX_MOVIE_TITLE_LENGTH = 120
export const MAX_MOVIE_DESCRIPTION_LENGTH = 1000

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

export function formatMovieFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}
