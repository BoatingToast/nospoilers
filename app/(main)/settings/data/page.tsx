import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import type { Metadata } from 'next'
import { authOptions } from '@/lib/auth'
import PageHeader from '@/components/ui/PageHeader'
import Section from '@/components/ui/Section'
import TasteImport from '@/components/settings/TasteImport'

export const metadata: Metadata = { title: 'Import & Export — NoSpoilers' }

export default async function ImportExportPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <PageHeader
        title="IMPORT & EXPORT"
        lede="Bring your existing movie history into NoSpoilers. You will review every match before anything is saved."
      />

      <div className="mt-10">
        <TasteImport />
      </div>

      <Section
        title="Export NoSpoilers data"
        note="Account export is planned for this page. Imports are available now."
        className="mt-12"
      />
    </div>
  )
}
