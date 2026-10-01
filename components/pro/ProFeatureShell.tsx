import Link from 'next/link'
import { ArrowRightIcon } from '@/components/icons'
import PageHeader from '@/components/ui/PageHeader'
import { PRO_TOOLS, type ProTool } from './pro-tools'

export default function ProFeatureShell({ tool, children }: { tool: ProTool; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl px-4 py-6 sm:px-6 sm:py-9">
      <nav aria-label="Pro navigation" className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/pro" className="inline-flex min-h-11 items-center gap-2 font-heading text-sm text-ns-muted underline-offset-4 hover:text-ns-text hover:underline"><ArrowRightIcon size={15} className="rotate-180" /> Back to Pro lobby</Link>
        <details className="group relative ml-auto">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded border border-ns-border px-4 font-heading text-sm text-ns-text hover:border-ns-text [&::-webkit-details-marker]:hidden">Switch tool <span aria-hidden="true" className="text-ns-muted group-open:rotate-180">⌄</span></summary>
          <div className="absolute right-0 top-full z-30 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded border border-ns-border bg-ns-surface">
            {PRO_TOOLS.map(({ slug, title }) => (
              <Link key={slug} href={`/pro/${slug}`} aria-current={slug === tool.slug ? 'page' : undefined} className={`flex min-h-11 items-center border-t border-ns-border px-4 font-heading text-sm first:border-t-0 hover:bg-ns-surface-2 ${slug === tool.slug ? 'text-ns-secondary-readable' : 'text-ns-muted hover:text-ns-text'}`}>{title}</Link>
            ))}
          </div>
        </details>
      </nav>
      <PageHeader
        title={tool.title}
        lede={<>{tool.description} <span className="text-ns-muted">{tool.category}.</span></>}
        className="mb-8 mt-6 sm:mb-10 sm:mt-8"
      />
      {children}
    </div>
  )
}
