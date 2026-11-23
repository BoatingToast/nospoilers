import Image from 'next/image'
import { FilmIcon } from '@/components/icons'
import { tmdbImageUrl } from '@/lib/utils'

interface Props {
  path: string | null
  size?: 'w185' | 'w342' | 'w500' | 'w780'
  sizes: string
  alt?: string
  className?: string
  priority?: boolean
}

/** Fills a positioned poster frame, with a quiet stand-in for films without artwork. */
export default function PosterFill({ path, size = 'w342', sizes, alt = '', className = 'object-cover', priority }: Props) {
  if (!path) {
    return (
      <span
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
        className="absolute inset-0 flex items-center justify-center bg-ns-surface-2 text-ns-subtle"
      >
        <FilmIcon size={24} />
      </span>
    )
  }

  return <Image src={tmdbImageUrl(path, size)} alt={alt} fill sizes={sizes} className={className} priority={priority} />
}
