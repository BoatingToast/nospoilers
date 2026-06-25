export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function tmdbImageUrl(path: string | null, size: 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w342'): string {
  if (!path) return '/placeholder-poster.svg'
  return `https://image.tmdb.org/t/p/${size}${path}`
}

export function formatYear(dateString: string | null | undefined): string {
  if (!dateString) return 'TBA'
  return new Date(dateString).getFullYear().toString()
}

export function formatRating(rating: number): string {
  return rating.toFixed(1)
}
