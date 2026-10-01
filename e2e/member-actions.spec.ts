import { expect, test } from '@playwright/test'
import { gotoHydrated, mockMemberSession } from './support/session'

test.beforeEach(async ({ page }) => {
  await mockMemberSession(page)
  await page.route('**/api/watchlist?**', route => route.fulfill({ json: { items: [] } }))
  await page.route('**/api/ratings/603', route => route.fulfill({ json: { rating: null } }))
})

test('member can add, advance, and remove a watchlist item', async ({ page }) => {
  let addedMovie: Record<string, unknown> | undefined
  let updatedStatus: Record<string, unknown> | undefined
  let removed = false

  await page.route('**/api/watchlist', async route => {
    if (route.request().method() !== 'POST') return route.continue()
    addedMovie = route.request().postDataJSON()
    await route.fulfill({ json: { item: addedMovie } })
  })
  await page.route('**/api/watchlist/603', async route => {
    if (route.request().method() === 'PATCH') {
      updatedStatus = route.request().postDataJSON()
      return route.fulfill({ json: { success: true } })
    }
    if (route.request().method() === 'DELETE') {
      removed = true
      return route.fulfill({ json: { success: true } })
    }
    return route.continue()
  })

  await gotoHydrated(page, '/movie/603')
  await expect(page.getByRole('heading', { name: 'THE MATRIX' })).toBeVisible()

  await page.getByRole('button', { name: 'Add to Watchlist' }).click()
  await expect.poll(() => addedMovie?.status).toBe('want_to_watch')
  await expect(page.getByRole('button', { name: /Watchlist/ })).toBeVisible()

  await page.getByRole('button', { name: /Watchlist/ }).click()
  await expect.poll(() => updatedStatus).toEqual({ status: 'watched' })
  await expect(page.getByRole('button', { name: /Watched/ })).toBeVisible()

  await page.getByTitle('Remove from watchlist').click()
  await expect.poll(() => removed).toBe(true)
  await expect(page.getByRole('button', { name: 'Add to Watchlist' })).toBeVisible()
})

test('member can submit a rating and see it reflected immediately', async ({ page }) => {
  let ratingRequest: Record<string, unknown> | undefined
  await page.route('**/api/ratings', async route => {
    ratingRequest = route.request().postDataJSON()
    await route.fulfill({
      json: {
        rating: {
          id: 'rating-e2e',
          userId: 'e2e-user',
          ...ratingRequest,
          createdAt: new Date(0).toISOString(),
          updatedAt: new Date(0).toISOString(),
        },
      },
    })
  })

  await gotoHydrated(page, '/movie/603')
  await page.getByRole('button', { name: 'Rate this film' }).click()
  await expect(page.getByText('Your overall rating — 1 to 100')).toBeVisible()
  await page.getByRole('button', { name: 'Save Rating' }).click()

  await expect.poll(() => ratingRequest?.score).toBe(70)
  await expect(page.getByText('Your rating')).toBeVisible()
  await expect(page.getByText('Really good')).toBeVisible()
})
