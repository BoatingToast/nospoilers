import type { Metadata } from 'next'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasProAccess } from '@/lib/pro-access'
import { getProPreviewData } from '@/services/pro'
import ProPreview from '@/components/pro/ProPreview'
import ProWaitlistForm from '@/components/pro/ProWaitlistForm'
import {
  ArrowRightIcon,
  CheckIcon,
  ClapperboardIcon,
  MovieDnaIcon,
  RecsIcon,
  type IconProps,
} from '@/components/icons'

export const metadata: Metadata = {
  title: 'NoSpoilers Pro — Founding Preview',
  description: 'Try Tonight Mode, the Double-Feature Builder, and Taste Lab in the NoSpoilers Pro founding preview.',
}

const PRO_TOOLS: Array<{
  number: string
  title: string
  description: string
  proof: string
  Icon: React.ComponentType<IconProps>
}> = [
  {
    number: '01',
    title: 'Tonight Mode',
    description: 'Set your time, mood, and company. Pro ranks the movies you already saved and makes one spoiler-free call.',
    proof: 'Uses runtime, Movie DNA match, quality, and genre fit',
    Icon: RecsIcon,
  },
  {
    number: '02',
    title: 'Double-Feature Builder',
    description: 'Build a cohesive two-film mood or a deliberate change of pace without blowing past the time you have.',
    proof: 'Pairs your own queue by runtime and tonal overlap',
    Icon: ClapperboardIcon,
  },
  {
    number: '03',
    title: 'Taste Lab',
    description: 'See which signals are genuinely supported by your ratings, where your profile is thin, and what to rate next.',
    proof: 'Every insight comes with its sample size',
    Icon: MovieDnaIcon,
  },
]

export default async function ProPage() {
  const session = await getServerSession(authOptions)
  const initialEmail = session?.user?.email ?? ''
  const proAccess = hasProAccess(initialEmail)
  const previewData = proAccess && session?.user?.id
    ? await getProPreviewData(session.user.id)
    : null

  return (
    <div className="relative isolate overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[620px] w-[880px] -translate-x-1/2 rounded-full bg-ns-secondary/15 blur-[130px]"
      />

      <section className="px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-5xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-ns-success/30 bg-ns-success/10 px-3 py-1.5 text-[10px] font-heading font-semibold uppercase tracking-[0.2em] text-ns-success">
            <span className="h-1.5 w-1.5 rounded-full bg-ns-success" />
            Private beta in progress
          </span>

          <p className="mt-8 font-display text-2xl tracking-[0.24em] text-ns-secondary-readable">
            NOSPOILERS PRO
          </p>
          <h1 className="mt-3 font-heading text-4xl font-semibold tracking-tight text-white sm:text-6xl">
            Stop searching.
            <span className="block text-ns-muted">Start the right movie.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-ns-muted sm:text-lg">
            Pro turns the taste profile and watchlist you already built into a decision system—then shows its work without ever leaning on plot details.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-ns-muted">
            {['Decides from your queue', 'Explains every pick', 'Plot Passport protected'].map(item => (
              <span key={item} className="inline-flex items-center gap-1.5">
                <CheckIcon size={13} className="text-ns-success" /> {item}
              </span>
            ))}
          </div>

          <div className="mt-9 flex items-end justify-center gap-2" aria-label="$4.99 per month at launch">
            <span className="font-heading text-5xl font-semibold text-white">$4.99</span>
            <span className="pb-1.5 text-sm text-ns-muted">/ month at launch</span>
          </div>
          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-ns-muted/70">
            Join the waitlist · No payment today
          </p>

          {previewData ? (
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="#pro-lab"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-ns-secondary px-6 py-3 text-sm font-heading font-semibold text-white transition-colors hover:bg-ns-secondary/90"
              >
                Open my Pro Lab <ArrowRightIcon size={15} />
              </Link>
              <Link
                href="/watchlist"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-ns-border px-6 py-3 text-sm font-heading font-semibold text-ns-muted transition-colors hover:border-ns-secondary/40 hover:text-white"
              >
                Tune my queue
              </Link>
            </div>
          ) : (
            <div className="mx-auto mt-10 max-w-2xl rounded-3xl border border-ns-border bg-ns-surface/85 p-5 text-left shadow-2xl shadow-ns-secondary/10 backdrop-blur sm:p-7">
              <div className="mb-5">
                <p className="text-[10px] font-heading font-semibold uppercase tracking-[0.18em] text-ns-secondary-readable">
                  Join the founding list
                </p>
                <h2 className="mt-1 font-heading text-xl font-semibold text-white">
                  Be first in line for Pro
                </h2>
                <p className="mt-1 text-sm leading-6 text-ns-muted">
                  We’ll save your place for launch and send an invitation when access expands.
                </p>
              </div>
              <ProWaitlistForm initialEmail={initialEmail} signedIn={Boolean(session)} />
            </div>
          )}
        </div>
      </section>

      {previewData && (
        <ProPreview data={previewData} username={session?.user?.name ?? 'movie fan'} />
      )}

      <section className="px-4 py-16 sm:px-6 sm:py-24" aria-labelledby="pro-tools-heading">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-xs font-heading font-semibold uppercase tracking-[0.2em] text-ns-secondary-readable">
              Included in the preview
            </p>
            <h2 id="pro-tools-heading" className="mt-3 font-heading text-3xl font-semibold text-white sm:text-4xl">
              Three tools that earn their place.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-ns-muted">
              The preview starts with decision quality and useful self-knowledge—the things that improve every movie night, not cosmetic account perks.
            </p>
          </div>

          <div className="mt-9 grid gap-4 lg:grid-cols-3">
            {PRO_TOOLS.map(({ number, title, description, proof, Icon }) => (
              <article
                key={number}
                className="group rounded-3xl border border-ns-border bg-ns-surface/65 p-6 transition-colors hover:border-ns-secondary/35"
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-2xl tracking-widest text-ns-secondary-readable/70">{number}</span>
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-ns-secondary/10 text-ns-secondary-readable transition-colors group-hover:bg-ns-secondary group-hover:text-white">
                    <Icon size={19} />
                  </span>
                </div>
                <h3 className="mt-6 font-heading text-xl font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-ns-muted">{description}</p>
                <p className="mt-5 border-t border-ns-border pt-4 text-[10px] leading-5 text-ns-secondary-readable">
                  {proof}
                </p>
              </article>
            ))}
          </div>

          {!session && (
            <div className="mt-8 flex flex-col items-center justify-between gap-5 rounded-2xl border border-ns-secondary/25 bg-ns-secondary/10 p-5 text-center sm:flex-row sm:text-left">
              <div>
                <p className="font-heading text-sm font-semibold text-white">Already joined with your email?</p>
                <p className="mt-1 text-xs text-ns-muted">Sign in with that address and your founding preview will be waiting.</p>
              </div>
              <Link href="/login?callbackUrl=/pro" className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-xl border border-ns-secondary/40 px-4 py-2.5 text-xs font-heading font-semibold text-ns-secondary-readable transition-colors hover:bg-ns-secondary hover:text-white">
                Sign in to Pro <ArrowRightIcon size={13} />
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
