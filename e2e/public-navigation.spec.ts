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

  const search = page.getByPlaceholder('Search for a movie...')
  await search.fill('Matrix')
  await page.getByRole('button', { name: 'Search', exact: true }).click()

  await expect(page).toHaveURL(/\/search\?q=Matrix$/)
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
  const searchResponse = page.waitForResponse(response => response.url().includes('/api/search?q='), {
    timeout: 20_000,
  })
  await page.getByPlaceholder('Search movies, actors, directors...').fill('Matrix')
  await expect((await searchResponse).ok()).toBe(true)

  await expect(page.getByText('Movies', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'The Matrix The Matrix 1999' })).toBeVisible()
  await expect(page.getByText('People', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: /Keanu Reeves/ })).toBeVisible()
})
