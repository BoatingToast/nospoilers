import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasProAccess } from '@/lib/pro-access'
import { publicPageMetadata } from '@/lib/seo'
import { ArrowRightIcon, CheckIcon, LockIcon } from '@/components/icons'
import { getProTool } from '@/components/pro/pro-tools'
import ProWaitlistForm from '@/components/pro/ProWaitlistForm'

export const metadata = publicPageMetadata({ title: 'Get Pro Access', description: 'Join the founding list for NoSpoilers Pro.', path: '/pro/access' })

export default async function ProAccessPage({ searchParams }: { searchParams: Promise<{ feature?: string }> }) {
  const session = await getServerSession(authOptions)
  const tool = getProTool((await searchParams).feature ?? '')
  if (session?.user?.id && hasProAccess(session.user.email)) redirect(tool ? `/pro/${tool.slug}` : '/pro')
  const callbackUrl = tool ? `/pro/${tool.slug}` : '/pro'

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <Link href="/pro" className="inline-flex min-h-11 items-center gap-2 text-sm text-ns-muted hover:text-white"><ArrowRightIcon size={15} className="rotate-180" /> Back to Pro lobby</Link>
      <div className="mt-7 grid overflow-hidden rounded-3xl border border-ns-border bg-ns-surface md:grid-cols-2">
        <div className="border-b border-ns-border bg-gradient-to-br from-ns-secondary/15 to-transparent p-6 sm:p-9 md:border-b-0 md:border-r">
          <span className="inline-flex items-center gap-2 text-xs font-heading uppercase tracking-widest text-ns-secondary-readable"><LockIcon size={15} /> Founding membership</span>
          <h1 className="mt-6 font-heading text-3xl font-semibold tracking-tight text-white">{tool ? `${tool.title} is a Pro space.` : 'Your next chapter in movies.'}</h1>
          <p className="mt-4 text-sm leading-7 text-ns-muted">{tool ? tool.description : 'A personal companion, better movie nights, and a space to explore your taste.'} Pro is currently in private preview.</p>
          <p className="mt-8"><span className="font-display text-6xl text-white">$4.99</span><span className="ml-2 text-sm text-ns-muted">/ month at launch</span></p>
          <p className="mt-2 text-xs leading-6 text-ns-muted">No payment collected during preview. Cancel anytime at launch.</p>
          <ul className="mt-7 space-y-3 text-sm text-ns-text">
            {['All seven Pro experiences', 'Future Pro features included', 'Spoiler-free discovery, always'].map(item => <li key={item} className="flex items-center gap-2"><CheckIcon size={14} className="shrink-0 text-ns-success" />{item}</li>)}
          </ul>
        </div>
        <div className="flex flex-col justify-center p-6 sm:p-9">
          <h2 className="font-heading text-2xl font-semibold text-white">Join the founding list.</h2>
          <p className="mb-7 mt-3 text-sm leading-6 text-ns-muted">Save your place. We&apos;ll send you an invitation when access expands.</p>
          <ProWaitlistForm initialEmail={session?.user?.email ?? ''} signedIn={Boolean(session)} />
          {!session && <p className="mt-6 text-sm leading-6 text-ns-muted">Already have access? <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="font-medium text-ns-secondary-readable hover:text-white">Sign in to continue</Link></p>}
        </div>
      </div>
    </div>
  )
}
