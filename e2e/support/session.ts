import type { Page } from '@playwright/test'

export const memberSession = {
  user: {
    id: 'e2e-user',
    name: 'e2e-viewer',
    email: 'viewer@example.test',
    image: null,
    onboardingCompleted: true,
  },
  expires: '2099-01-01T00:00:00.000Z',
}

export async function mockSignedOutSession(page: Page) {
  await page.route('**/api/auth/session', route => route.fulfill({ json: {} }))
}

export async function mockMemberSession(page: Page) {
  await page.route('**/api/auth/session', route => route.fulfill({ json: memberSession }))
  await page.route('**/api/achievements', route => route.fulfill({ json: { achievements: [] } }))
  await page.route('**/api/reviews?**', route => route.fulfill({ json: { reviews: [], total: 0 } }))
  await page.route('**/api/reviews/stats?**', route => route.fulfill({ json: { stats: null } }))
  await page.route('**/api/spoiler-zone/**', route => route.fulfill({ json: {} }))
  await page.route('**/api/user/spoiler-zones/**', route => route.fulfill({ json: {} }))
  await page.route('**/api/notifications/**', route => route.fulfill({ json: { count: 0, notifications: [] } }))
}

export async function gotoHydrated(page: Page, path: string) {
  const sessionRequested = page.waitForRequest(request => request.url().includes('/api/auth/session'))
  await page.goto(path, { waitUntil: 'domcontentloaded' })
  await sessionRequested
}
