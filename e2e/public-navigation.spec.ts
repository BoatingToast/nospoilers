import { expect, test } from '@playwright/test'
import { gotoHydrated, mockSignedOutSession } from './support/session'

test.beforeEach(async ({ page }) => {
  await mockSignedOutSession(page)
})

test('landing page stays within the viewport and search reaches results', async ({ page }) => {
  await gotoHydrated(page, '/')

  await expect(page.getByRole('heading', { name: 'DISCOVER' })).toBeVisible()
  await expect(page.getByText('FEATURED FILMS')).toBeVisible()

  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }))
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport)

  const landingSearch = page.locator('form').filter({ has: page.getByRole('button', { name: 'Search', exact: true }) })
  const search = landingSearch.getByRole('textbox', { name: 'Search movies and people' })
  await search.fill('Matrix')
  await landingSearch.getByRole('button', { name: 'Search', exact: true }).click()

  await expect(page).toHaveURL(/\/search\?q=Matrix$/, { timeout: 20_000 })
  await expect(page.getByRole('heading', { name: '“Matrix”' })).toBeVisible()
  await expect(page.getByRole('link', { name: /The Matrix/ })).toBeVisible()
})

test('mobile menu exposes navigation and multi-search results', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile'), 'Mobile navigation regression')
  await gotoHydrated(page, '/')

  await page.getByRole('button', { name: 'Open menu' }).click()
  await expect(page.getByLabel('Mobile navigation')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Discover', exact: true })).toBeVisible()

  await page.getByRole('button', { name: /Search movies/ }).click()
  const searchDialog = page.getByRole('dialog', { name: 'Search movies and people' })
  const searchResponse = page.waitForResponse(response => response.url().includes('/api/search?q='), {
    timeout: 20_000,
  })
  await searchDialog.getByPlaceholder('Search movies, actors, directors...').fill('Matrix')
  await expect((await searchResponse).ok()).toBe(true)

  await expect(searchDialog.getByText('Movies', { exact: true })).toBeVisible()
  await expect(searchDialog.getByRole('link', { name: /The Matrix/ })).toBeVisible()
  await expect(searchDialog.getByText('People', { exact: true })).toBeVisible()
  await expect(searchDialog.getByRole('link', { name: /Keanu Reeves/ })).toBeVisible()
})
