import Navbar from '@/components/landing/Navbar'
import Hero from '@/components/landing/Hero'
import FeaturedMovies from '@/components/landing/FeaturedMovies'
import ShieldFeature from '@/components/landing/ShieldFeature'
import Footer from '@/components/landing/Footer'
import MovieDiscoveryIntro from '@/components/landing/MovieDiscoveryIntro'
import JsonLd from '@/components/seo/JsonLd'
import { absoluteUrl, publicPageMetadata, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from '@/lib/seo'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  ...publicPageMetadata({ title: 'Spoiler-Free Movie Recommendations', description: SITE_DESCRIPTION, path: '/' }),
  title: { absolute: SITE_TITLE },
}

export default function HomePage() {
  return (
    <main className="bg-ns-bg min-h-screen">
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebSite',
            '@id': `${SITE_URL}/#website`,
            url: absoluteUrl('/'),
            name: SITE_NAME,
            alternateName: 'No Spoilers',
            description: SITE_DESCRIPTION,
            inLanguage: 'en',
            publisher: { '@id': `${SITE_URL}/#organization` },
          },
          {
            '@type': 'Organization',
            '@id': `${SITE_URL}/#organization`,
            name: SITE_NAME,
            url: absoluteUrl('/'),
            logo: absoluteUrl('/icon.png'),
            sameAs: [
              'https://www.tiktok.com/@nospoilers.xyz',
              'https://www.instagram.com/nospoilers.xyz/',
              'https://www.linkedin.com/company/nospoilersxyz',
            ],
          },
        ],
      }} />
      <Navbar />
      <Hero />
      <MovieDiscoveryIntro />
      <ShieldFeature />
      <FeaturedMovies />
      <Footer />
    </main>
  )
}
