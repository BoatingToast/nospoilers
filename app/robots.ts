import type { MetadataRoute } from 'next'
import { absoluteUrl, IS_PREVIEW } from '@/lib/seo'

export default function robots(): MetadataRoute.Robots {
  return {
    // Let crawlers read the noindex directives on account and search pages.
    rules: { userAgent: '*', allow: '/', disallow: IS_PREVIEW ? '/' : '/api/' },
    sitemap: absoluteUrl('/sitemap.xml'),
  }
}
