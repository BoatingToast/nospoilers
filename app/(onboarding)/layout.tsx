import Link from 'next/link'

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen min-w-0 flex-col bg-ns-bg">
      <header className="border-b border-ns-border px-4 sm:px-6">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4">
          <Link href="/" className="font-display text-xl tracking-widest text-ns-text transition-colors hover:text-ns-secondary-readable">
            NOSPOILERS
          </Link>
          <p className="text-right font-body text-sm text-ns-muted">
            Setting up your profile
          </p>
        </div>
      </header>
      <main className="min-w-0 flex-1 px-4 py-10 sm:px-6 sm:py-14">
        {children}
      </main>
    </div>
  )
}
