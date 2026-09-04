import type { Metadata } from 'next'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasProAccess } from '@/lib/pro-access'
import { getProPreviewData } from '@/services/pro'
import ProCommandCenter from '@/components/pro/ProCommandCenter'
import ProPreview from '@/components/pro/ProPreview'
import ProWaitlistForm from '@/components/pro/ProWaitlistForm'
import {
  ArrowRightIcon,
  CheckIcon,
  ClapperboardIcon,
  FriendsIcon,
  LockIcon,
  MovieDnaIcon,
  RecsIcon,
  WatchlistIcon,
  type IconProps,
} from '@/components/icons'

export const metadata: Metadata = {
  title: 'NoSpoilers Pro — Your Personal Cinema OS',
  description: 'Build a 3D cinema identity, talk to Lumi, control every reveal, and turn your taste into better movie nights with NoSpoilers Pro.',
}

const PRO_SYSTEMS: Array<{
  number: string
  label: string
  title: string
  description: string
  detail: string
  Icon: React.ComponentType<IconProps>
}> = [
  {
    number: '01',
    label: 'New · Interactive 3D',
    title: 'Living Taste Twin',
    description: 'Build a dimensional character that makes your movie identity visible—and gives every room you enter a sense of presence.',
    detail: 'Real-time 3D · Device-saved identity · Motion states',
    Icon: MovieDnaIcon,
  },
  {
    number: '02',
    label: 'New · GPT-4o mini',
    title: 'Lumi Cinema AI',
    description: 'A decisive companion that understands your constraints and talks in mood, craft, and energy—never plot.',
    detail: 'Server-only AI · Spoiler-locked prompt · Preview fallback',
    Icon: RecsIcon,
  },
  {
    number: '03',
    label: 'New · Universal layer',
    title: 'Adaptive Spoiler Field',
    description: 'Set your progress once. NoSpoilers changes what reviews, friends, search, and AI are allowed to reveal everywhere.',
    detail: 'Progress-aware · Cross-product boundary · Zero leaks',
    Icon: LockIcon,
  },
  {
    number: '04',
    label: 'Pro decision engine',
    title: 'Tonight Mode',
    description: 'Give Pro your time, mood, and company. It makes one confident choice from the films you already wanted to see.',
    detail: 'Queue fit · Runtime logic · Movie DNA confidence',
    Icon: WatchlistIcon,
  },
  {
    number: '05',
    label: 'Pro movie night',
    title: 'Double-Feature Architect',
    description: 'Design a two-film arc by total runtime and tonal movement, from a cohesive world to a deliberate change of pace.',
    detail: 'Pair scoring · Tonal arcs · Time-budget aware',
    Icon: ClapperboardIcon,
  },
  {
    number: '06',
    label: 'Pro intelligence',
    title: 'Taste Lab',
    description: 'See the evidence behind your Movie DNA, the craft you consistently reward, and the rating that would teach Pro most.',
    detail: 'Signal depth · Taste receipts · Next-best rating',
    Icon: FriendsIcon,
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
    <div className="relative isolate overflow-hidden bg-ns-bg">
      <div aria-hidden="true" className="pro-page-noise pointer-events-none fixed inset-0 z-50 opacity-[0.035]" />

      <section className="relative min-h-[calc(100svh-4rem)] overflow-hidden border-b border-white/10 px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-20">
        <div aria-hidden="true" className="pro-hero-grid absolute inset-0" />
        <div aria-hidden="true" className="absolute -left-36 top-20 h-96 w-96 rounded-full bg-ns-secondary/20 blur-[130px]" />
        <div aria-hidden="true" className="absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-ns-tier-epic/10 blur-[120px]" />

        <div className="relative mx-auto grid min-h-[680px] max-w-[1400px] items-center gap-14 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.035] px-3 py-2 backdrop-blur">
              <span className="rounded-full bg-ns-secondary px-2.5 py-1 text-[8px] font-heading font-semibold uppercase tracking-[0.18em] text-white">Pro 2.0</span>
              <span className="text-[9px] font-heading uppercase tracking-[0.16em] text-ns-muted">Interactive first look</span>
            </div>

            <p className="mt-8 font-display text-xl tracking-[0.28em] text-ns-secondary-readable sm:text-2xl">YOUR PERSONAL CINEMA OS</p>
            <h1 className="mt-4 font-heading text-5xl font-semibold leading-[0.95] tracking-[-0.055em] text-white sm:text-7xl xl:text-[88px]">
              Your taste.
              <span className="block text-ns-secondary-readable">Your universe.</span>
              <span className="block text-ns-muted">Zero spoilers.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-8 text-ns-muted sm:text-lg">
              NoSpoilers Pro turns your Movie DNA into a living 3D identity, a private AI companion, and an adaptive shield that follows every story you start.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href={previewData ? '#cinema-os' : '#pro-access'} className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-ns-secondary px-6 py-3.5 text-sm font-heading font-semibold text-white shadow-xl shadow-ns-secondary/20 transition-transform hover:-translate-y-0.5 hover:bg-ns-secondary/90">
                {previewData ? 'Enter Cinema OS' : 'Request private access'} <ArrowRightIcon size={15} />
              </Link>
              <Link href="#pro-access" className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.025] px-6 py-3.5 text-sm font-heading font-semibold text-ns-text transition-colors hover:border-ns-secondary/45 hover:text-white">
                Get founding access
              </Link>
            </div>

            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/10 pt-6 text-[10px] text-ns-muted">
              {['Interactive 3D studio', 'GPT-4o mini ready', 'Spoiler-safe by design'].map(item => (
                <span key={item} className="inline-flex items-center gap-2"><CheckIcon size={12} className="text-ns-success" /> {item}</span>
              ))}
            </div>
          </div>

          <div aria-hidden="true" className="pro-hero-object relative mx-auto h-[480px] w-full max-w-[620px] sm:h-[580px]">
            <div className="pro-hero-orbit pro-hero-orbit-one absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-ns-secondary-readable/15 sm:h-[520px] sm:w-[520px]" />
            <div className="pro-hero-orbit pro-hero-orbit-two absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-ns-secondary-readable/25 sm:h-[390px] sm:w-[390px]" />
            <div className="pro-hero-core absolute left-1/2 top-1/2 grid h-48 w-48 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-ns-secondary-readable/30 bg-ns-surface/80 shadow-2xl shadow-ns-secondary/35 backdrop-blur sm:h-60 sm:w-60">
              <div className="text-center">
                <MovieDnaIcon size={52} className="mx-auto text-ns-secondary-readable" strokeWidth={1.1} />
                <p className="mt-4 font-display text-2xl tracking-[0.18em] text-white">NOVA-07</p>
                <p className="mt-1 text-[7px] uppercase tracking-[0.2em] text-ns-success">Taste twin online</p>
              </div>
            </div>
            {[
              { className: 'left-0 top-[22%] -rotate-6', label: 'MOOD SIGNAL', value: 'MAGNETIC', sub: 'Tonight / 92% fit' },
              { className: 'right-0 top-[15%] rotate-6', label: 'SPOILER FIELD', value: 'ACTIVE', sub: '4 layers protected' },
              { className: 'bottom-[8%] left-[9%] rotate-3', label: 'LUMI SAYS', value: 'ONE PERFECT PICK', sub: 'No endless scroll' },
              { className: 'bottom-[2%] right-[2%] -rotate-3', label: 'PRESENCE', value: '3 FRIENDS', sub: 'Room ready' },
            ].map(card => (
              <div key={card.label} className={`pro-hero-card absolute w-40 rounded-2xl border border-white/10 bg-ns-surface/75 p-4 shadow-2xl shadow-black/35 backdrop-blur-md sm:w-48 ${card.className}`}>
                <p className="text-[7px] font-heading tracking-[0.2em] text-ns-muted">{card.label}</p>
                <p className="mt-2 font-display text-xl tracking-[0.07em] text-white">{card.value}</p>
                <p className="mt-1 text-[8px] text-ns-secondary-readable">{card.sub}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mx-auto grid max-w-[1400px] gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-3">
          {[
            ['01', 'Decide', 'One answer, not another list'],
            ['02', 'Become', 'A living identity shaped by taste'],
            ['03', 'Protect', 'One boundary across every surface'],
          ].map(([number, label, detail]) => (
            <div key={number} className="flex items-center gap-4 bg-ns-bg/85 px-5 py-4">
              <span className="font-display text-2xl text-ns-secondary-readable/55">{number}</span>
              <div><p className="font-heading text-[10px] font-semibold uppercase tracking-[0.14em] text-white">{label}</p><p className="mt-1 text-[9px] text-ns-muted">{detail}</p></div>
            </div>
          ))}
        </div>
      </section>

      {previewData ? (
        <ProCommandCenter />
      ) : (
        <section id="cinema-os" className="scroll-mt-24 px-4 py-16 sm:px-6 sm:py-20" aria-labelledby="private-preview-title">
          <div className="relative mx-auto max-w-[1400px] overflow-hidden rounded-[28px] border border-white/10 bg-ns-surface px-6 py-16 text-center shadow-2xl shadow-black/40 sm:px-10 sm:py-24">
            <div aria-hidden="true" className="pro-horizon-grid absolute inset-0 opacity-55" />
            <div className="relative mx-auto max-w-2xl">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-ns-secondary/35 bg-ns-secondary/15 text-ns-secondary-readable">
                <LockIcon size={22} />
              </span>
              <p className="mt-6 text-[9px] font-heading font-semibold uppercase tracking-[0.22em] text-ns-secondary-readable">Invite-only preview</p>
              <h2 id="private-preview-title" className="mt-3 font-heading text-3xl font-semibold text-white sm:text-5xl">Cinema OS is access locked.</h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-ns-muted">The 3D Identity Forge, Lumi AI, and Adaptive Spoiler Field are currently visible only to approved Pro preview accounts.</p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="#pro-access" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-ns-secondary px-5 text-xs font-heading font-semibold text-white">Join the private list <ArrowRightIcon size={14} /></Link>
                {!session && <Link href="/login?callbackUrl=/pro" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-ns-border px-5 text-xs font-heading font-semibold text-ns-muted hover:border-ns-secondary/40 hover:text-white">Sign in with access</Link>}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="relative border-y border-white/10 px-4 py-20 sm:px-6 sm:py-28" aria-labelledby="pro-systems-title">
        <div aria-hidden="true" className="pro-hero-grid absolute inset-0 opacity-40" />
        <div className="relative mx-auto max-w-[1400px]">
          <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
            <div>
              <p className="font-heading text-[10px] font-semibold uppercase tracking-[0.24em] text-ns-secondary-readable">The complete system</p>
              <h2 id="pro-systems-title" className="mt-3 font-heading text-4xl font-semibold tracking-tight text-white sm:text-5xl">Worth it before the opening credits.</h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-ns-muted lg:justify-self-end">Six connected tools solve the whole movie-night problem: who you are, what to watch, who to watch with, and how to stay protected until the final frame.</p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {PRO_SYSTEMS.map(({ number, label, title, description, detail, Icon }, index) => (
              <article key={number} className={`pro-system-card group relative min-h-[330px] overflow-hidden rounded-3xl border border-white/10 bg-ns-surface/65 p-6 transition-all hover:-translate-y-1 hover:border-ns-secondary/35 ${index === 0 ? 'md:col-span-2 xl:col-span-1' : ''}`}>
                <div aria-hidden="true" className="absolute -right-12 -top-12 h-40 w-40 rounded-full border border-ns-secondary-readable/10 transition-transform duration-700 group-hover:scale-125" />
                <div className="relative flex items-center justify-between">
                  <span className="font-display text-3xl tracking-widest text-ns-secondary-readable/55">{number}</span>
                  <span className="grid h-11 w-11 place-items-center rounded-2xl border border-ns-secondary/25 bg-ns-secondary/10 text-ns-secondary-readable transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110"><Icon size={19} /></span>
                </div>
                <div className="relative mt-12">
                  <p className="text-[8px] font-heading font-semibold uppercase tracking-[0.19em] text-ns-secondary-readable">{label}</p>
                  <h3 className="mt-2 font-heading text-xl font-semibold text-white">{title}</h3>
                  <p className="mt-3 text-xs leading-6 text-ns-muted">{description}</p>
                  <p className="mt-6 border-t border-white/10 pt-4 text-[8px] uppercase tracking-[0.12em] text-ns-muted/75">{detail}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {previewData && <ProPreview data={previewData} username={session?.user?.name ?? 'movie fan'} />}

      <section id="pro-access" className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28" aria-labelledby="pro-access-title">
        <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[30px] border border-white/10 bg-ns-surface shadow-2xl shadow-black/40 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative overflow-hidden border-b border-white/10 p-7 lg:border-b-0 lg:border-r sm:p-10">
            <div aria-hidden="true" className="pro-horizon-grid absolute inset-0 opacity-60" />
            <div className="relative">
              <p className="text-[9px] font-heading font-semibold uppercase tracking-[0.22em] text-ns-secondary-readable">Founding membership</p>
              <h2 id="pro-access-title" className="mt-3 font-heading text-3xl font-semibold text-white sm:text-4xl">Your cinema universe starts here.</h2>
              <div className="mt-8 flex items-end gap-2">
                <span className="font-display text-7xl tracking-wide text-white">$4.99</span>
                <span className="pb-2 text-xs text-ns-muted">/ month at launch</span>
              </div>
              <p className="mt-3 text-xs leading-6 text-ns-muted">Founding price. Cancel anytime. No payment is collected while Pro is in preview.</p>
              <div className="mt-8 grid gap-3 text-xs text-ns-text">
                {['All six Pro systems', 'Future Pro features included', 'Your spoiler boundaries stay yours'].map(item => (
                  <span key={item} className="flex items-center gap-2"><span className="grid h-5 w-5 place-items-center rounded-full bg-ns-success/10 text-ns-success"><CheckIcon size={11} /></span>{item}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center p-6 sm:p-10">
            <div className="w-full">
              {previewData ? (
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-ns-success/25 bg-ns-success/10 px-3 py-2 text-[9px] font-heading uppercase tracking-[0.14em] text-ns-success"><span className="h-1.5 w-1.5 rounded-full bg-ns-success" /> Founding preview active</span>
                  <h3 className="mt-5 font-heading text-2xl font-semibold text-white">You’re already inside.</h3>
                  <p className="mt-2 max-w-lg text-sm leading-7 text-ns-muted">Your access includes the interactive Cinema OS above and the data-powered Pro Lab below it.</p>
                  <Link href="#pro-lab" className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl bg-ns-secondary px-5 text-xs font-heading font-semibold text-white">Open my Pro Lab <ArrowRightIcon size={14} /></Link>
                </div>
              ) : (
                <div>
                  <p className="text-[9px] font-heading font-semibold uppercase tracking-[0.2em] text-ns-secondary-readable">Reserve your identity</p>
                  <h3 className="mt-2 font-heading text-2xl font-semibold text-white">Join the founding list.</h3>
                  <p className="mb-7 mt-2 text-sm leading-6 text-ns-muted">We’ll save your place and send one launch invitation when access expands.</p>
                  <ProWaitlistForm initialEmail={initialEmail} signedIn={Boolean(session)} />
                  {!session && (
                    <p className="mt-5 text-[10px] text-ns-muted">Already joined? <Link href="/login?callbackUrl=/pro" className="font-semibold text-ns-secondary-readable hover:text-white">Sign in to check your access →</Link></p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
