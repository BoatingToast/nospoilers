import Link from 'next/link'
import { ArrowRightIcon } from '@/components/icons'
import { PRO_TOOLS, type ProTool } from './pro-tools'

export default function ProFeatureShell({ tool, children }: { tool: ProTool; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-9">
      <nav aria-label="Pro navigation" className="flex flex-wrap items-center justify-between gap-3 border-b border-ns-border pb-5">
        <Link href="/pro" className="inline-flex min-h-11 items-center gap-2 text-sm font-heading text-ns-muted transition-colors hover:text-white"><ArrowRightIcon size={15} className="rotate-180" /> Back to Pro lobby</Link>
        <details className="group relative ml-auto">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-xl border border-ns-border bg-ns-surface px-4 text-sm text-ns-text [&::-webkit-details-marker]:hidden">Switch tool <span aria-hidden="true" className="text-ns-muted group-open:rotate-180">⌄</span></summary>
          <div className="absolute right-0 top-full z-30 mt-2 w-64 rounded-2xl border border-ns-border bg-ns-surface p-2 shadow-2xl shadow-black/50">
            {PRO_TOOLS.map(({ slug, title, Icon }) => (
              <Link key={slug} href={`/pro/${slug}`} aria-current={slug === tool.slug ? 'page' : undefined} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors hover:bg-ns-surface-2 ${slug === tool.slug ? 'bg-ns-secondary/15 text-ns-secondary-readable' : 'text-ns-muted hover:text-white'}`}><Icon size={16} />{title}</Link>
            ))}
          </div>
        </details>
      </nav>
      <header className="py-7 sm:py-9">
        <p className="text-xs font-heading font-semibold uppercase tracking-[0.18em] text-ns-secondary-readable">Pro / {tool.category}</p>
        <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-white sm:text-4xl">{tool.title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ns-muted sm:text-base">{tool.description}</p>
      </header>
      {children}
    </div>
  )
}
