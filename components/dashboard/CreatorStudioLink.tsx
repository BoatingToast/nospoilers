import Link from 'next/link'
import { ArrowRightIcon } from '@/components/icons'

export default function CreatorStudioLink() {
  return (
    <Link
      href="/creator"
      className="group ml-auto flex w-full items-center justify-between gap-4 rounded-2xl bg-ns-surface px-5 py-4 transition-colors duration-150 hover:bg-ns-surface-2 sm:w-auto"
    >
      <span className="min-w-0">
        <span className="block text-sm text-ns-muted">Made a movie?</span>
        <span className="block font-heading text-base font-semibold text-ns-text">Open Filmmaker Studio</span>
      </span>
      <ArrowRightIcon size={16} className="flex-shrink-0 text-ns-muted transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-0.5 motion-reduce:transform-none" />
    </Link>
  )
}
