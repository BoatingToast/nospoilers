import type { Metadata } from 'next'
import Link from 'next/link'
import UploadMovieSection from '@/components/dashboard/UploadMovieSection'
import { ArrowRightIcon, CheckIcon, UploadMovieIcon } from '@/components/icons'

export const metadata: Metadata = { title: 'Creator Studio — NoSpoilers' }

const uploadDetails = [
  'MP4, MOV, M4V, or WEBM up to 1 GB',
  'Add streaming links so viewers know where to watch',
  'Catalog matching keeps your film connected to the right title',
]

export default function CreatorPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/dashboard"
        className="mb-8 inline-flex items-center gap-1 text-xs font-body text-ns-muted transition-colors hover:text-ns-secondary-readable"
      >
        <ArrowRightIcon size={12} className="rotate-180" /> Back to dashboard
      </Link>

      <header className="mb-8 border-b border-ns-border pb-8">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-ns-secondary/25 bg-ns-secondary/10 text-ns-secondary-readable">
            <UploadMovieIcon size={23} />
          </span>
          <div>
            <p className="text-[10px] font-body uppercase tracking-[0.22em] text-ns-secondary-readable">Creator Studio</p>
            <h1 className="mt-1 font-display text-4xl tracking-wider text-ns-text sm:text-6xl">SHARE YOUR FILM</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed font-body text-ns-muted">
              Upload a film you made and give the NoSpoilers community a safe way to discover it.
            </p>
          </div>
        </div>
      </header>

      <UploadMovieSection />

      <Link href="/theater/new" className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#ddbd86]/25 bg-[#ddbd86]/5 p-6 transition-colors hover:border-[#ddbd86]/50">
        <div><p className="text-[9px] uppercase tracking-[.2em] text-[#ddbd86]">NoSpoilers Pro · Theater</p><h2 className="mt-2 font-heading text-lg font-semibold text-ns-text">Give your film an opening night.</h2><p className="mt-2 max-w-xl text-xs leading-6 text-ns-muted">Schedule a film or trailer premiere, promote it in Theater, and watch your audience arrive in a shared 3D cinema.</p></div>
        <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#ddbd86]">Host a premiere <ArrowRightIcon size={14} /></span>
      </Link>

      <section aria-labelledby="upload-details-title" className="mt-6 rounded-2xl border border-ns-border bg-ns-surface/55 p-5 sm:p-6">
        <h2 id="upload-details-title" className="font-heading text-sm font-semibold text-ns-text">Before you upload</h2>
        <ul className="mt-4 grid gap-3 md:grid-cols-3">
          {uploadDetails.map(detail => (
            <li key={detail} className="flex items-start gap-2 text-xs leading-relaxed font-body text-ns-muted">
              <CheckIcon size={14} className="mt-0.5 flex-shrink-0 text-ns-secondary-readable" />
              {detail}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
