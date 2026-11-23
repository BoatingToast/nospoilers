import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getWhereWasISession } from '@/services/where-was-i'
import WhereWasIClient from '@/components/where-was-i/WhereWasIClient'

export const metadata: Metadata = {
  title: 'Where Was I? — NoSpoilers',
  description: 'Resume a story with a source-backed refresher that stops at your confirmed progress.',
}

export default async function WhereWasIPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const data = await getWhereWasISession(session.user.id, 'the-signal-at-kestrel')
  if (!data) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-4 py-20 text-center sm:px-6">
        <h1 className="font-display text-4xl text-ns-text sm:text-5xl">Where was I?</h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-ns-muted">
          The demo corpus has not been ingested yet. Run <code className="break-all rounded bg-ns-surface px-2 py-1 text-sm text-ns-text">npm run ingest:where-was-i</code> after applying the database migration.
        </p>
      </div>
    )
  }

  return <WhereWasIClient initialData={data} />
}
