import type { Metadata } from 'next'
import Footer from '@/components/landing/Footer'
import Navbar from '@/components/landing/Navbar'
import Button from '@/components/ui/Button'

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <div className="flex min-h-dvh min-w-0 flex-col bg-ns-bg">
      <Navbar />
      <main className="ns-hero-glow flex flex-1 items-center px-4 pb-24 pt-32 sm:px-6">
        <div className="mx-auto w-full max-w-3xl text-center">
          <h1 className="font-display text-[clamp(2.5rem,7vw,4.5rem)] text-ns-text">
            This page could not be found.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-loose text-ns-muted">
            Whatever was here has been{' '}
            <span aria-hidden="true" className="ns-redact">completely covered up</span>
            <span className="sr-only">redacted</span>.
            {' '}Let&apos;s find you something else to watch.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" href="/discover">Discover movies</Button>
            <Button size="lg" variant="secondary" href="/">Back to home</Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
