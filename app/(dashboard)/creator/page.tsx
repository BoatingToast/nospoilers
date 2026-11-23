import type { Metadata } from 'next'
import Link from 'next/link'
import PageHeader from '@/components/ui/PageHeader'
import UploadMovieSection from '@/components/dashboard/UploadMovieSection'
import AudienceLabDashboard from '@/components/creator/AudienceLabDashboard'
import FilmmakerStudioMap from '@/components/creator/FilmmakerStudioMap'
import { ArrowRightIcon } from '@/components/icons'

export const metadata: Metadata = { title: 'Filmmaker Studio — NoSpoilers' }

export default function CreatorPage() {
  return (
    <div>
      <Link
        href="/dashboard"
        className="-ml-3 mb-4 inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ns-muted transition-colors hover:bg-ns-surface hover:text-ns-text"
      >
        <ArrowRightIcon size={14} className="rotate-180" /> Back to dashboard
      </Link>

      <PageHeader
        title="Build your audience."
        description="Test your film with real viewers, learn who it connects with, and keep control of your work."
      />

      <div className="mt-8 grid gap-6 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <div id="films" className="scroll-mt-28">
            <UploadMovieSection />
          </div>

          <AudienceLabDashboard />

          <Link
            href="/theater/new"
            className="ns-reveal group flex flex-col gap-4 rounded-2xl bg-ns-surface p-6 transition-colors duration-150 hover:bg-ns-surface-2 sm:flex-row sm:items-center sm:justify-between sm:p-8"
          >
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ns-muted">NoSpoilers Pro · Theater</span>
              <span className="mt-1.5 block font-heading text-2xl font-bold text-ns-text">Give your film an opening night.</span>
              <span className="mt-2 block max-w-xl text-base leading-relaxed text-ns-muted">
                Schedule a private film or trailer screening, watch your audience arrive, then turn their responses into market proof.
              </span>
            </span>
            <span className="inline-flex flex-shrink-0 items-center gap-2 text-sm font-semibold text-ns-text">
              Host a premiere
              <ArrowRightIcon size={16} className="transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-1 motion-reduce:transform-none" />
            </span>
          </Link>
        </div>

        <aside className="min-w-0">
          <FilmmakerStudioMap />
        </aside>
      </div>
    </div>
  )
}
