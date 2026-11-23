import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasProAccess } from '@/lib/pro-access'
import { publicPageMetadata } from '@/lib/seo'
import { ArrowRightIcon, CheckIcon } from '@/components/icons'
import { getProTool } from '@/components/pro/pro-tools'
import ProAccessPreview from '@/components/pro/ProAccessPreview'
import ProWaitlistForm from '@/components/pro/ProWaitlistForm'

export const metadata = publicPageMetadata({ title: 'Get Pro Access', description: 'Join the founding list for NoSpoilers Pro.', path: '/pro/access' })

const INCLUDED = ['All seven Pro experiences', 'Future Pro features included', 'Spoiler-free discovery, always']

export default async function ProAccessPage({ searchParams }: { searchParams: Promise<{ feature?: string }> }) {
  const session = await getServerSession(authOptions)
  const tool = getProTool((await searchParams).feature ?? '')
  if (session?.user?.id && hasProAccess(session.user.email)) redirect(tool ? `/pro/${tool.slug}` : '/pro')
  const callbackUrl = tool ? `/pro/${tool.slug}` : '/pro'

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8 lg:pb-24">
      <Link href="/pro" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-ns-muted transition-colors hover:text-ns-text">
        <ArrowRightIcon size={16} className="rotate-180" /> Back to Pro lobby
      </Link>

      <div className="mt-8 grid gap-10 lg:mt-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start lg:gap-16">
        <div className="min-w-0">
          <h1 className="font-display text-5xl text-ns-text sm:text-6xl lg:text-7xl">
            {tool ? `${tool.title} is a Pro space.` : 'Your next chapter in movies.'}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-ns-muted">
            {tool ? tool.description : 'A personal companion, better movie nights, and a space to explore your taste.'} Pro is currently in private preview.
          </p>
          <p className="mt-8 flex flex-wrap items-baseline gap-x-2">
            <span className="font-display text-6xl tabular-nums text-ns-text">$4.99</span>
            <span className="text-base text-ns-muted">/ month at launch</span>
          </p>
          <p className="mt-2 text-sm leading-6 text-ns-muted">No payment collected during preview. Cancel anytime at launch.</p>
          <ul className="mt-7 space-y-3 text-base text-ns-text">
            {INCLUDED.map(item => (
              <li key={item} className="flex items-center gap-3">
                <CheckIcon size={16} className="flex-shrink-0 text-ns-success" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl bg-ns-surface p-7 sm:p-10">
          <h2 className="font-display text-3xl text-ns-text sm:text-4xl">Join the founding list.</h2>
          <p className="mb-7 mt-3 text-base leading-relaxed text-ns-muted">Save your place. We&apos;ll send you an invitation when access expands.</p>
          <ProWaitlistForm initialEmail={session?.user?.email ?? ''} signedIn={Boolean(session)} />
          {!session && (
            <p className="mt-6 border-t border-ns-border pt-5 text-sm text-ns-muted">
              Already have access?{' '}
              <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="inline-flex min-h-11 items-center font-semibold text-ns-secondary-readable transition-colors hover:text-ns-text">
                Sign in to continue
              </Link>
            </p>
          )}
        </div>
      </div>

      <section aria-labelledby="pro-preview-heading" className="ns-reveal mt-14 grid gap-6 lg:mt-20 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-16">
        <h2 id="pro-preview-heading" className="font-display text-4xl text-ns-text sm:text-5xl">
          {tool ? 'See it in action.' : 'See what’s inside.'}
        </h2>
        <ProAccessPreview slug={tool?.slug} />
      </section>
    </div>
  )
}
