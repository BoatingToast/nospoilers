import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
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
      // Supabase Storage — avatars bucket
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

export default nextConfig
