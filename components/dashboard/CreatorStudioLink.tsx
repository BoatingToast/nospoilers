import Link from 'next/link'
import { ArrowRightIcon, UploadMovieIcon } from '@/components/icons'

export default function CreatorStudioLink() {
  return (
    <Link
      href="/creator"
      className="group ml-auto inline-flex w-full items-center gap-3 rounded-xl border border-ns-border bg-ns-surface/70 px-4 py-3 transition-colors hover:border-ns-secondary/40 hover:bg-ns-surface sm:w-auto"
    >
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-ns-secondary/10 text-ns-secondary-readable">
        <UploadMovieIcon size={17} />
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-body uppercase tracking-[0.16em] text-ns-muted">Made a movie?</span>
        <span className="block text-xs font-heading font-semibold text-ns-text">Open Creator Studio</span>
      </span>
      <ArrowRightIcon size={14} className="ml-auto text-ns-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ns-secondary-readable" />
    </Link>
  )
}
