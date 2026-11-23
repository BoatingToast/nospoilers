import type { Metadata } from 'next'
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from 'next/font/google'
import SessionProvider from '@/components/providers/SessionProvider'
import AchievementNotificationProvider from '@/components/achievements/AchievementNotificationProvider'
import ProLaunchBanner from '@/components/pro/ProLaunchBanner'
import MotionRuntime from '@/components/ui/MotionRuntime'
import { PUBLIC_ROBOTS, SITE_DESCRIPTION, SITE_IMAGE, SITE_NAME, SITE_TITLE, SITE_URL } from '@/lib/seo'
import './globals.css'

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  axes: ['opsz'],
  variable: '--font-bricolage',
  display: 'swap',
})

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
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
      className={`${bricolage.variable} ${jakarta.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Runs before first paint so entrance states never flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: "try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.dataset.motion='on'}catch(e){}",
          }}
        />
      </head>
      <body className="font-body bg-ns-bg text-ns-text antialiased">
        <SessionProvider>
          <ProLaunchBanner />
          <div className="pt-8">{children}</div>
          <AchievementNotificationProvider />
        </SessionProvider>
        <MotionRuntime />
      </body>
    </html>
  )
}
