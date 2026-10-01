import Link from 'next/link'

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ns-bg flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between border-b border-ns-border/50">
        <Link href="/" className="font-display text-xl tracking-widest text-ns-muted hover:text-ns-text transition-colors">
          NOSPOILERS
        </Link>
        <p className="text-ns-muted/40 text-xs font-body tracking-widest uppercase">
          Setting up your profile
        </p>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {children}
      </main>
    </div>
  )
}
