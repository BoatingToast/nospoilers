import type { Metadata } from 'next'
import { Inter, Bebas_Neue, Space_Grotesk } from 'next/font/google'
import SessionProvider from '@/components/providers/SessionProvider'
import AchievementNotificationProvider from '@/components/achievements/AchievementNotificationProvider'
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
  title: {
    default:  'NoSpoilers — Discover Movies Without Spoilers',
    template: '%s | NoSpoilers',
  },
  description: 'Find movies you\'ll love without having the story spoiled. Personalized recommendations, zero plot twists.',
  keywords:    ['movies', 'film discovery', 'no spoilers', 'movie recommendations'],
  openGraph: {
    type:        'website',
    title:       'NoSpoilers',
    description: 'Discover movies without spoilers.',
    siteName:    'NoSpoilers',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${bebasNeue.variable} ${spaceGrotesk.variable}`}>
      <body className="font-body bg-ns-bg text-ns-text antialiased">
        <SessionProvider>
          {children}
          <AchievementNotificationProvider />
        </SessionProvider>
      </body>
    </html>
  )
}
