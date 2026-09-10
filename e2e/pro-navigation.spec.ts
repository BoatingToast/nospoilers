import { expect, test } from '@playwright/test'
import { encode } from 'next-auth/jwt'
import { gotoHydrated, mockMemberSession, mockSignedOutSession } from './support/session'

test('Pro lobby launches features and keeps signup on its own screen', async ({ page }) => {
  await mockSignedOutSession(page)
  await gotoHydrated(page, '/pro')
  await expect(page.getByRole('heading', { name: 'The lobby.', exact: true })).toBeVisible()
  await expect(page.getByRole('textbox')).toHaveCount(0)
  for (const name of ['Tonight Mode', 'Lumi AI', 'Identity Forge', 'Double Feature', 'Taste Lab', 'Spoiler Field', 'NoSpoilers Theater', 'NoSpoilers Lab']) {
    await expect(page.getByRole('link', { name: `Open ${name}`, exact: true })).toBeVisible()
  }
  const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }))
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport)

  await page.getByRole('link', { name: 'Open Tonight Mode', exact: true }).press('Enter')
  await expect(page).toHaveURL(/\/pro\/access\?feature=tonight$/)
  await expect(page.getByRole('heading', { name: 'Tonight Mode is a Pro space.' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Sign in to continue' })).toHaveAttribute('href', '/login?callbackUrl=%2Fpro%2Ftonight')
  await page.getByRole('link', { name: 'Back to Pro lobby' }).click()
  await expect(page).toHaveURL(/\/pro$/)
  await expect(page.getByRole('link', { name: 'Open Tonight Mode', exact: true })).toBeVisible()
})

test('direct feature URLs require Pro access and unknown tools return 404', async ({ page }) => {
  await mockSignedOutSession(page)
  for (const slug of ['tonight', 'lumi', 'identity', 'double-feature', 'taste-lab', 'spoiler-field']) {
    await page.goto(`/pro/${slug}`)
    await expect(page).toHaveURL(new RegExp(`/pro/access\\?feature=${slug}$`))
    await expect(page.getByRole('heading', { name: 'Join the founding list.' })).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Message Lumi' })).toHaveCount(0)
  }
  await page.goto('/pro/not-a-tool')
  // Streaming may send the shell before notFound; the UI must still be a 404.
  await expect(page.getByRole('heading', { name: 'This page could not be found.' })).toBeVisible()
})

test('Pro members can switch focused screens and return to their Lumi conversation', async ({ page, context, baseURL }) => {
  test.skip(Boolean(process.env.E2E_BASE_URL) && !process.env.E2E_PRO_TEST_SESSION, 'Requires the local test server with its fixture session secret.')
  await mockMemberSession(page)
  const token = await encode({
    secret: 'nospoilers-e2e-secret',
    token: { id: 'e2e-pro-user', email: 'emoon0108@gmail.com', name: 'Pro tester', image: null, onboardingCompleted: true },
    maxAge: 3600,
  })
  await context.addCookies([{ name: 'next-auth.session-token', value: token, url: baseURL!, httpOnly: true, sameSite: 'Lax' }])
  await page.route('**/api/pro/concierge', route => route.fulfill({ json: { message: 'Try a warm, visually rich comedy for tonight.' } }))

  await gotoHydrated(page, '/pro')
  await expect(page.getByRole('main').getByText('Founding member', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Open Lumi AI', exact: true }).click()
  await expect(page).toHaveURL(/\/pro\/lumi$/)
  await expect(page.getByRole('heading', { name: 'Lumi AI', exact: true })).toBeVisible()
  await expect(page.getByRole('tablist')).toHaveCount(0)
  await expect(page.getByLabel('Identity name')).toHaveCount(0)
  await page.getByRole('textbox', { name: 'Message Lumi' }).fill('A relaxed movie night, please.')
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(page.getByText('Try a warm, visually rich comedy for tonight.', { exact: true })).toBeVisible()

  await page.getByText('Switch tool', { exact: false }).click()
  await page.getByRole('link', { name: 'Spoiler Field', exact: true }).click()
  await expect(page).toHaveURL(/\/pro\/spoiler-field$/)
  await expect(page.getByRole('heading', { name: 'Spoiler Field', exact: true })).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Message Lumi' })).toHaveCount(0)
  await page.getByRole('slider', { name: 'Movie progress percentage' }).fill('60')
  await expect(page.getByRole('heading', { name: 'What is safe at 60%' })).toBeVisible()
  const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }))
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport)

  await page.getByRole('link', { name: 'Back to Pro lobby' }).click()
  await page.getByRole('link', { name: 'Open Lumi AI', exact: true }).click()
  await expect(page.getByText('Try a warm, visually rich comedy for tonight.', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Lumi AI', exact: true })).toBeVisible()
  await expect(page.getByText('Try a warm, visually rich comedy for tonight.', { exact: true })).toBeVisible()
})
