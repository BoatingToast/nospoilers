import Navbar from '@/components/landing/Navbar'
import Hero from '@/components/landing/Hero'
import FeaturedMovies from '@/components/landing/FeaturedMovies'

export default function HomePage() {
  return (
    <main className="bg-ns-bg min-h-screen">
      <Navbar />
      <Hero />
      <FeaturedMovies />

      {/* Footer */}
      <footer className="bg-ns-bg border-t border-ns-border px-6 py-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-display text-xl tracking-widest text-ns-muted">NOSPOILERS</span>
          <p className="text-ns-muted/50 text-xs font-body">
            © {new Date().getFullYear()} NoSpoilers. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  )
}
