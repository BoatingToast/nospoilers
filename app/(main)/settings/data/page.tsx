import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import type { Metadata } from 'next'
import { authOptions } from '@/lib/auth'
import TasteImport from '@/components/settings/TasteImport'

export const metadata: Metadata = { title: 'Import & Export — NoSpoilers' }

export default async function ImportExportPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-8 border-b border-ns-border pb-7">
        <p className="mb-2 text-xs font-body uppercase tracking-widest text-ns-muted">Settings</p>
        <h1 className="font-display text-4xl tracking-wider text-ns-text sm:text-5xl">IMPORT &amp; EXPORT</h1>
        <p className="mt-3 max-w-2xl text-sm font-body leading-relaxed text-ns-muted">
          Bring your existing movie history into NoSpoilers. You will review every match before anything is saved.
        </p>
      </div>

      <TasteImport />

      <section className="mt-10 rounded-2xl border border-ns-border bg-ns-surface p-5 opacity-70">
        <p className="text-sm font-heading font-semibold text-ns-text">Export NoSpoilers data</p>
        <p className="mt-1 text-xs font-body text-ns-muted">Account export is planned for this page. Imports are available now.</p>
      </section>
    </div>
  )
}
