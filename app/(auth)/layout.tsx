import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen min-w-0 flex-col bg-ns-bg">
      <header className="border-b border-ns-border px-4 sm:px-6">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center">
          <Link href="/" className="font-display text-xl tracking-widest text-ns-text transition-colors hover:text-ns-secondary-readable">
            NOSPOILERS
          </Link>
        </div>
      </header>
      <main className="min-w-0 flex-1 px-4 py-12 sm:px-6 sm:py-20">
        {children}
      </main>
    </div>
  )
}
