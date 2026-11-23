import Link from 'next/link'
import { ArrowRightIcon } from '@/components/icons'

const modules = [
  { name: 'Audience Labs', description: 'Test screenings with verified feedback and taste-fit analysis.', status: 'Live beta', href: '#audience-labs' },
  { name: 'Market Proof', description: 'Pitch-ready demand, advocacy, engagement, and audience-fit evidence.', status: 'Live in Labs', href: '#audience-labs' },
  { name: 'Audience Match', description: 'Recruit the viewers most likely to connect with a project.', status: 'Next' },
  { name: 'Film Circles', description: 'Keep an opted-in audience from first look through release.', status: 'Next' },
  { name: 'Creative Tests', description: 'Compare trailers, posters, loglines, and campaign ideas.', status: 'Planned' },
  { name: 'Launch', description: 'Move interested fans into tickets, streams, or crowdfunding.', status: 'Planned' },
  { name: 'Rights & Revenue', description: 'Track deal terms, expenses, payments, and rights-return dates.', status: 'Planned' },
  { name: 'Collaborators', description: 'Find trusted creative and distribution partners by real work.', status: 'Planned' },
] as const

function statusDot(status: string) {
  if (status.startsWith('Live')) return 'bg-ns-success'
  if (status === 'Next') return 'bg-ns-warning'
  return 'bg-ns-subtle'
}

export default function FilmmakerStudioMap() {
  return (
    <section aria-labelledby="studio-map-title" className="rounded-2xl bg-ns-surface p-6">
      <h2 id="studio-map-title" className="font-heading text-xl font-bold text-ns-text">Your filmmaker operating system</h2>
      <p className="mt-2 text-sm leading-relaxed text-ns-muted">
        Each module will use the same film and audience record, so filmmakers never rebuild their community or export it into disconnected tools.
      </p>

      <ul className="mt-4 divide-y divide-ns-border">
        {modules.map((module, index) => {
          const content = (
            <>
              <span className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-1.5 font-heading text-base font-semibold text-ns-text">
                  {module.name}
                  {'href' in module && (
                    <ArrowRightIcon size={14} className="flex-shrink-0 transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-0.5 motion-reduce:transform-none" />
                  )}
                </span>
                <span className="flex flex-shrink-0 items-center gap-1.5 text-xs text-ns-muted">
                  <span aria-hidden="true" className={`h-2 w-2 rounded-full ${statusDot(module.status)}`} />
                  {module.status}
                </span>
              </span>
              <span className="mt-1 block text-sm leading-relaxed text-ns-muted">{module.description}</span>
            </>
          )

          return (
            <li key={module.name} className="ns-reveal" style={{ '--i': Math.min(index, 7) } as React.CSSProperties}>
              {'href' in module ? (
                <Link href={module.href} className="group -mx-2 block rounded-xl px-2 py-3 transition-colors duration-150 hover:bg-ns-surface-2">
                  {content}
                </Link>
              ) : (
                <div className="py-3">{content}</div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
