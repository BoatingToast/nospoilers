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
      <main className="mx-auto min-h-[70vh] max-w-3xl px-4 py-32 text-center sm:px-6">
        <h1 className="font-display text-5xl text-white">WHERE WAS I?</h1>
        <p className="mt-5 text-sm leading-7 text-ns-muted">The demo corpus has not been ingested yet. Run <code className="rounded bg-ns-surface px-2 py-1 text-ns-text">npm run ingest:where-was-i</code> after applying the database migration.</p>
      </main>
    )
  }

  return <WhereWasIClient initialData={data} />
}
