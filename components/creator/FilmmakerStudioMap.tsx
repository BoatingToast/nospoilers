import Link from 'next/link'

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

export default function FilmmakerStudioMap() {
  return <section aria-labelledby="studio-map-title" className="mb-8">
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] uppercase tracking-[.2em] text-ns-secondary-readable">One film · One audience · One workspace</p><h2 id="studio-map-title" className="mt-1 font-heading text-xl font-semibold text-ns-text">Your filmmaker operating system</h2></div><p className="max-w-md text-xs leading-5 text-ns-muted">Each module will use the same film and audience record, so filmmakers never rebuild their community or export it into disconnected tools.</p></div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{modules.map(module => {
      const content = <><div className="flex items-center justify-between gap-3"><span className={`h-2 w-2 rounded-full ${module.status.startsWith('Live') ? 'bg-emerald-400' : module.status === 'Next' ? 'bg-amber-400' : 'bg-ns-muted/40'}`} /><span className="text-[9px] uppercase tracking-[.16em] text-ns-muted">{module.status}</span></div><h3 className="mt-4 font-heading text-sm font-semibold text-ns-text">{module.name}</h3><p className="mt-2 text-xs leading-5 text-ns-muted">{module.description}</p></>
      return 'href' in module ? <Link key={module.name} href={module.href} className="rounded-2xl border border-ns-border bg-ns-surface/45 p-5 transition-colors hover:border-ns-secondary/40">{content}</Link> : <div key={module.name} className="rounded-2xl border border-ns-border bg-ns-surface/25 p-5">{content}</div>
    })}</div>
  </section>
}
