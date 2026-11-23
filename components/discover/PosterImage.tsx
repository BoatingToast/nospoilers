import Image from 'next/image'
import { FilmIcon, PersonIcon } from '@/components/icons'
import { cn, tmdbImageUrl } from '@/lib/utils'

interface PosterImageProps {
  path: string | null
  size?: 'w185' | 'w342' | 'w500'
  sizes: string
  alt?: string
  preload?: boolean
  fallback?: 'film' | 'person'
  className?: string
}

/** Fills a positioned frame, with a quiet icon when the catalog has no image. */
export default function PosterImage({
  path,
  size = 'w342',
  sizes,
  alt = '',
  preload = false,
  fallback = 'film',
  className,
}: PosterImageProps) {
  if (!path) {
    const Icon = fallback === 'person' ? PersonIcon : FilmIcon
    return (
      <span
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
        className="absolute inset-0 flex items-center justify-center bg-ns-surface-2 text-ns-subtle"
      >
        <Icon size={32} />
      </span>
    )
  }

  return (
    <Image
      src={tmdbImageUrl(path, size)}
      alt={alt}
      fill
      sizes={sizes}
      preload={preload}
      className={cn('object-cover', className)}
    />
  )
}
