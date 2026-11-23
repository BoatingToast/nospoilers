import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import ProShowcase from './ProShowcase'

export default function ProLobby({ hasAccess }: { hasAccess: boolean }) {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 sm:pt-14 lg:pb-24">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-[clamp(3.5rem,11vw,7.5rem)] text-ns-text">The lobby.</h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-ns-muted">
            Find a film, plan a double feature, or explore your movie taste.
          </p>
        </div>
        {hasAccess ? (
          <Badge variant="secondary" size="md" className="self-start sm:mb-2 sm:self-end">Founding member</Badge>
        ) : (
          <div className="flex flex-shrink-0 items-center gap-3 sm:mb-1">
            <span className="text-sm text-ns-muted">Private preview</span>
            <Button href="/pro/access" variant="outline">Get access</Button>
          </div>
        )}
      </header>

      <ProShowcase />

      {!hasAccess && (
        <section className="ns-reveal mt-12 flex flex-col gap-5 rounded-3xl bg-ns-surface p-7 sm:flex-row sm:items-center sm:justify-between sm:p-10 lg:mt-16">
          <h2 className="font-display text-3xl text-ns-text sm:text-4xl">Pro is in private preview.</h2>
          <Button href="/pro/access" variant="outline" size="lg" className="flex-shrink-0">Join the waitlist for access</Button>
        </section>
      )}
    </div>
  )
}
