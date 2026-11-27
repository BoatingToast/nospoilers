import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import type { Metadata } from 'next'
import { authOptions } from '@/lib/auth'
import TasteImport from '@/components/settings/TasteImport'
import PageHeader from '@/components/ui/PageHeader'

export const metadata: Metadata = { title: 'Import & Export' }

export default async function ImportExportPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <>
      <PageHeader
        title="Import &amp; export"
        description="Bring your existing movie history into NoSpoilers. You will review every match before anything is saved."
      />

      <div className="mt-8">
        <TasteImport />
      </div>

      <section className="ns-reveal mt-10">
        <h2 className="font-heading text-xl font-bold text-ns-text">Export NoSpoilers data</h2>
        <p className="mt-1 text-base text-ns-muted">Account export is planned for this page. Imports are available now.</p>
      </section>
    </>
  )
}
