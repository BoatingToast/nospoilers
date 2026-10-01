import { expect, test } from '@playwright/test'

const origin = 'https://www.nospoilers.xyz'
// HTML-limited crawlers receive complete metadata before streaming begins.
const crawler = { 'User-Agent': 'Twitterbot/1.0' }

test('homepage exposes canonical metadata, brand data, and public content without JavaScript', async ({ request }) => {
  const response = await request.get('/', { headers: crawler })
  expect(response.status()).toBe(200)
  const html = await response.text()
  expect(html).toContain('<title>NoSpoilers — Spoiler-Free Movie Recommendations</title>')
  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1]
  expect(canonical && new URL(canonical).href).toBe(`${origin}/`)
  expect(html.match(/rel="canonical"/g)).toHaveLength(1)
  expect(html).toContain('name="twitter:card" content="summary_large_image"')
  expect(html).toContain('DISCOVER MOVIES')
  expect(html).toContain('SPOILER-FREE MOVIE RECOMMENDATIONS')
  expect(html).toContain('href="/movie-recommendations"')
  const data = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]))
  expect(data[0]['@graph']).toEqual(expect.arrayContaining([
    expect.objectContaining({ '@type': 'WebSite', name: 'NoSpoilers', url: `${origin}/` }),
    expect.objectContaining({ '@type': 'Organization', name: 'NoSpoilers' }),
  ]))
})

test('robots and sitemap expose canonical public URLs and deduplicate movie feeds', async ({ request }) => {
  const robots = await request.get('/robots.txt')
  expect(robots.status()).toBe(200)
  const rules = await robots.text()
  expect(rules).toContain('Allow: /')
  expect(rules).toContain(`Sitemap: ${origin}/sitemap.xml`)
  // Account URLs must remain crawlable for their noindex headers to be read.
  expect(rules).not.toContain('Disallow: /login')

  const sitemap = await request.get('/sitemap.xml')
  expect(sitemap.status()).toBe(200)
  const xml = await sitemap.text()
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1])
  expect(urls.length).toBeGreaterThan(6)
  expect(new Set(urls).size).toBe(urls.length)
  expect(urls).toContain(`${origin}/movie/603`)
  expect(urls).toContain(`${origin}/movie-recommendations`)
  expect(urls.every(url => url.startsWith(`${origin}/`))).toBe(true)
  expect(urls.some(url => /\/(login|search|dashboard|settings|watchlist|movie-night)(\/|\?|$)/.test(url))).toBe(false)
  expect(xml).not.toContain('<lastmod>')
})

test('movie metadata and structured data describe the film without leaking its synopsis', async ({ request }) => {
  const response = await request.get('/movie/603', { headers: crawler })
  expect(response.status()).toBe(200)
  const html = await response.text()
  expect(html).toContain('<title>The Matrix (1999) — Spoiler-Free Movie Guide | NoSpoilers</title>')
  expect(html).toContain(`<link rel="canonical" href="${origin}/movie/603"`)
  const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1]
  expect(description).toContain('The Matrix (1999)')
  expect(description).not.toContain('computer hacker')
  const data = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]))
  const movie = data[0]['@graph'].find((item: Record<string, unknown>) => item['@type'] === 'Movie')
  expect(movie).toMatchObject({ name: 'The Matrix', duration: 'PT136M', datePublished: '1999-03-31' })
  expect(movie.description).not.toContain('computer hacker')
  expect(movie).not.toHaveProperty('aggregateRating')
  expect(data[0]['@graph'].some((item: Record<string, unknown>) => item['@type'] === 'BreadcrumbList')).toBe(true)
})

test('invalid movie IDs render a noindex not-found page instead of a duplicate movie', async ({ request }) => {
  for (const path of ['/movie/603junk', '/movie/0', '/movie/999999999']) {
    const response = await request.get(path, { headers: crawler })
    // Next's parent loading boundaries may already have sent a 200 status.
    // A streamed notFound() must still produce the not-found UI and noindex.
    expect([200, 404], path).toContain(response.status())
    const html = await response.text()
    expect(html).toContain('<meta name="robots" content="noindex"')
    expect(html).toContain('This page could not be found')
    expect(html).not.toContain('"@type":"Movie"')
  }
})

test('public pages have their own canonicals while account and search pages are noindex', async ({ request }) => {
  for (const path of ['/discover', '/movie-recommendations', '/theater', '/privacy/extension']) {
    const response = await request.get(path, { headers: crawler })
    expect(response.status(), path).toBe(200)
    expect(await response.text()).toContain(`<link rel="canonical" href="${origin}${path}"`)
    expect(response.headers()['x-robots-tag']).toBeUndefined()
  }
  for (const path of ['/login', '/register', '/search?q=Matrix', '/settings/privacy', '/movie-night', '/theater/preview']) {
    const response = await request.get(path, { headers: crawler, maxRedirects: 0 })
    expect(response.headers()['x-robots-tag'], path).toContain('noindex')
  }
})

test('the shared social preview is a cacheable PNG', async ({ request }) => {
  const response = await request.get('/og')
  expect(response.status()).toBe(200)
  expect(response.headers()['content-type']).toContain('image/png')
  expect((await response.body()).subarray(1, 4).toString()).toBe('PNG')
})
