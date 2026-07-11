import Navbar from '@/components/landing/Navbar'
import Hero from '@/components/landing/Hero'
import FeaturedMovies from '@/components/landing/FeaturedMovies'
import Footer from '@/components/landing/Footer'

export default function HomePage() {
  return (
    <main className="bg-ns-bg min-h-screen">
      <Navbar />
      <Hero />
      <FeaturedMovies />
      <Footer />
    </main>
  )
}
