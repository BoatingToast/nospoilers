import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async headers() {
    const privatePages = [
      '/login', '/register', '/onboarding/:path*', '/dashboard/:path*', '/creator/:path*',
      '/search', '/settings/:path*', '/notifications/:path*', '/watchlist', '/history',
      '/ratings', '/my-recommendations', '/wrapped', '/achievements', '/friends/:path*',
      '/social/:path*', '/compatibility/:path*', '/plot-passport', '/spoiler-zones',
      '/movie-night/:path*', '/collections/new', '/collections/search',
      '/collections/:id/analytics', '/theater/new', '/theater/preview', '/theater/:id',
    ]
    const isPreview = process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production'
    return (isPreview ? ['/:path*'] : privatePages).map(source => ({
      source,
      headers: [{ key: 'X-Robots-Tag', value: 'noindex, follow' }],
    }))
  },
  images: {
    // Bypass Vercel's image optimizer (Hobby plan: 1,000 optimizations/month).
    // TMDB already serves properly-sized images at the requested width (w185,
    // w342, w500 etc.) so there is no benefit to re-optimizing them — doing so
    // only burns the monthly quota and causes 403s once it's exhausted.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '/t/p/**',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        pathname: '/vi/**',
      },
      // Legacy Supabase-hosted avatars remain readable after the database move.
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

export default nextConfig
