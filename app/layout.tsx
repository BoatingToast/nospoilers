import type { Metadata } from 'next'
import { Inter, Bebas_Neue, Space_Grotesk } from 'next/font/google'
import SessionProvider from '@/components/providers/SessionProvider'
import AchievementNotificationProvider from '@/components/achievements/AchievementNotificationProvider'
import ProLaunchBanner from '@/components/pro/ProLaunchBanner'
import { PUBLIC_ROBOTS, SITE_DESCRIPTION, SITE_IMAGE, SITE_NAME, SITE_TITLE, SITE_URL } from '@/lib/seo'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default:  SITE_TITLE,
    template: '%s | NoSpoilers',
  },
  description: SITE_DESCRIPTION,
  robots: PUBLIC_ROBOTS,
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION || undefined },
  openGraph: {
    type:        'website',
    title:       SITE_TITLE,
    description: SITE_DESCRIPTION,
    siteName:    SITE_NAME,
    locale:      'en_US',
    images:      [SITE_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [SITE_IMAGE],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${bebasNeue.variable} ${spaceGrotesk.variable}`}
    >
      <body className="font-body bg-ns-bg text-ns-text antialiased">
        <SessionProvider>
          <ProLaunchBanner />
          <div className="pt-8">{children}</div>
          <AchievementNotificationProvider />
        </SessionProvider>
      </body>
    </html>
  )
}
