import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasProAccess } from '@/lib/pro-access'
import { publicPageMetadata } from '@/lib/seo'
import { ArrowRightIcon } from '@/components/icons'
import PageHeader from '@/components/ui/PageHeader'
import Section from '@/components/ui/Section'
import { getProTool } from '@/components/pro/pro-tools'
import ProWaitlistForm from '@/components/pro/ProWaitlistForm'

export const metadata = publicPageMetadata({ title: 'Get Pro Access', description: 'Join the founding list for NoSpoilers Pro.', path: '/pro/access' })

export default async function ProAccessPage({ searchParams }: { searchParams: Promise<{ feature?: string }> }) {
  const session = await getServerSession(authOptions)
  const feature = (await searchParams).feature ?? ''
  const proTool = getProTool(feature)
  const tool = feature === 'lab'
    ? { title: 'NoSpoilers Lab', description: 'Import your footage, edit your film, and export your final cut in your own filmmaking workspace.' }
    : proTool
  const callbackUrl = feature === 'lab' ? '/lab' : proTool ? `/pro/${proTool.slug}` : '/pro'
  if (session?.user?.id && hasProAccess(session.user.email)) redirect(callbackUrl)

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl px-4 py-6 sm:px-6 sm:py-9">
      <Link href="/pro" className="inline-flex min-h-11 items-center gap-2 font-heading text-sm text-ns-muted underline-offset-4 hover:text-ns-text hover:underline"><ArrowRightIcon size={15} className="rotate-180" /> Back to Pro lobby</Link>
      <PageHeader
        title={tool ? `${tool.title} is a Pro space.` : 'Your next chapter in movies.'}
        lede={<>{tool ? tool.description : 'A personal companion, better movie nights, and a space to explore your taste.'} Pro is currently in private preview.</>}
        className="mt-6 sm:mt-8"
      />
      <div className="mt-10 grid min-w-0 gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Section title="Join the founding list." note="Save your place. We&apos;ll send you an invitation when access expands.">
          <ProWaitlistForm initialEmail={session?.user?.email ?? ''} signedIn={Boolean(session)} />
          {!session && <p className="mt-6 font-body text-sm leading-relaxed text-ns-muted">Already have access? <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="font-medium text-ns-secondary-readable underline underline-offset-4 hover:text-ns-text">Sign in to continue</Link></p>}
        </Section>
        <aside className="min-w-0 border-t-2 border-ns-text pt-4">
          <p className="font-heading text-sm font-semibold text-ns-text">Founding membership</p>
          <p className="mt-3"><span className="font-display text-6xl leading-none text-ns-text">$4.99</span><span className="ml-2 font-body text-sm text-ns-muted">/ month at launch</span></p>
          <p className="mt-2 font-body text-sm leading-relaxed text-ns-muted">No payment collected during preview. Cancel anytime at launch.</p>
          <ul className="mt-6 border-b border-ns-border font-body text-sm text-ns-text">
            {['All Pro experiences, including NoSpoilers Lab', 'Future Pro features included', 'Spoiler-free discovery, always'].map(item => <li key={item} className="border-t border-ns-border py-3">{item}</li>)}
          </ul>
        </aside>
      </div>
    </div>
  )
}
