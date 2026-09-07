import type { Metadata } from 'next'

// Use the verified production host, never NEXTAUTH_URL or a Vercel preview URL.
export const SITE_URL = new URL(process.env.SITE_URL || 'https://www.nospoilers.xyz').origin
export const SITE_NAME = 'NoSpoilers'
export const SITE_TITLE = 'NoSpoilers — Spoiler-Free Movie Recommendations'
export const SITE_DESCRIPTION = 'Discover movies without spoilers. Find your next watch with personalized movie recommendations, Movie DNA, ratings, watchlists, and similar films.'
export const IS_PREVIEW = Boolean(process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production')

export const PUBLIC_ROBOTS: Metadata['robots'] = {
  index: !IS_PREVIEW,
  follow: true,
  'max-image-preview': 'large',
}

export function absoluteUrl(path: string): string {
  return new URL(path, `${SITE_URL}/`).toString()
}

export const SITE_IMAGE = {
  url: absoluteUrl('/og'),
  width: 1200,
  height: 630,
  alt: 'NoSpoilers — discover your next movie without spoilers',
}

export function publicPageMetadata({
  title,
  description,
  path,
  image,
}: {
  title: string
  description: string
  path: string
  image?: { url: string; alt: string }
}): Metadata {
  const socialTitle = `${title} | ${SITE_NAME}`
  const images = [image ?? SITE_IMAGE]

  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(path) },
    robots: PUBLIC_ROBOTS,
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      locale: 'en_US',
      title: socialTitle,
      description,
      url: absoluteUrl(path),
      images,
    },
    twitter: { card: 'summary_large_image', title: socialTitle, description, images },
  }
}

export function parseCatalogId(value: string): number | null {
  if (!/^\d+$/.test(value)) return null
  const id = Number(value)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

// Metadata must not expose a synopsis, tagline, character name, or story outcome.
export function movieSearchDescription(movie: {
  title: string
  release_date: string
  genres: { name: string }[]
}): string {
  const year = /^\d{4}-/.test(movie.release_date) ? ` (${movie.release_date.slice(0, 4)})` : ''
  const genres = movie.genres.slice(0, 2).map(genre => genre.name.toLowerCase()).join(' and ')
  const article = /^[aeiou]/.test(genres) ? 'an' : 'a'
  return `Explore ${movie.title}${year}${genres ? `, ${article} ${genres} movie` : ''}, without spoilers. See ratings, runtime, audience fit, and similar movies on NoSpoilers.`
}

export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
