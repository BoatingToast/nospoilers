import Link from 'next/link'
import PageHeader from '@/components/ui/PageHeader'
import { ArrowRightIcon } from '@/components/icons'
import type { ProTool } from './pro-tools'
import ProToolSwitcher from './ProToolSwitcher'

export default function ProFeatureShell({ tool, children }: { tool: ProTool; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8 lg:pb-24">
      <nav aria-label="Pro navigation" className="flex items-center justify-between gap-3">
        <Link href="/pro" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-ns-muted transition-colors hover:text-ns-text">
          <ArrowRightIcon size={16} className="rotate-180" /> Back to Pro lobby
        </Link>
        <ProToolSwitcher currentSlug={tool.slug} />
      </nav>
      <PageHeader title={tool.title} description={tool.description} className="mt-8 sm:mt-10" />
      <div className="mt-8 sm:mt-10">{children}</div>
    </div>
  )
}
