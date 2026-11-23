import { Suspense } from 'react'
import Logo from '@/components/ui/Logo'
import AuthPosters from './AuthPosters'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-ns-bg lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div className="flex min-h-dvh flex-col px-4 sm:px-6 lg:px-12">
        <header className="py-5">
          <Logo />
        </header>
        <main className="flex flex-1 items-center justify-center pb-16 pt-6">
          {children}
        </main>
      </div>

      <aside aria-hidden="true" className="hidden p-3 lg:block">
        <div className="sticky top-3 h-[calc(100dvh-1.5rem)] overflow-hidden rounded-3xl bg-ns-surface">
          <Suspense fallback={null}>
            <AuthPosters />
          </Suspense>
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/10" />
          <p className="absolute inset-x-0 bottom-0 p-10 font-display text-5xl text-white xl:p-14 xl:text-6xl">
            Know what to watch.
            <br />
            Never <span className="ns-unredact">how it ends.</span>
          </p>
        </div>
      </aside>
    </div>
  )
}
