import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ns-bg flex flex-col">
      <header className="px-6 py-5">
        <Link href="/" className="font-display text-xl tracking-widest text-ns-muted hover:text-ns-text transition-colors">
          NOSPOILERS
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        {children}
      </main>
    </div>
  )
}
