import { expect, test } from '@playwright/test'
import { encode } from 'next-auth/jwt'
import { gotoHydrated, memberSession, mockMemberSession } from './support/session'

const signedUrl = 'https://movie-storage.example.test/storage/v1/object/upload/sign/movie-uploads/test/movie.mp4?token=test-upload-token'
const movieBytes = Buffer.from([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d])

test.beforeEach(async ({ page, context, baseURL }) => {
  test.skip(Boolean(process.env.E2E_BASE_URL) && !process.env.E2E_UPLOAD_TEST_SESSION, 'Requires the local test server with its fixture session secret.')
  await mockMemberSession(page)
  await page.route('**/api/notifications?**', route => route.fulfill({ json: { notifications: [], count: 0 } }))
  const token = await encode({ secret: 'nospoilers-e2e-secret', token: memberSession.user, maxAge: 3600 })
  await context.addCookies([{ name: 'next-auth.session-token', value: token, url: baseURL!, httpOnly: true, sameSite: 'Lax' }])
})

test('missing server storage is reported before choosing a movie', async ({ page }) => {
  await gotoHydrated(page, '/creator')
  await page.getByRole('main').getByTestId('upload-movie-launcher').click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Uploads are unavailable right now' })).toBeVisible()
  await expect(dialog.getByRole('alert')).toContainText('Movie uploads are temporarily unavailable')
  await expect(dialog.locator('input[type="file"]')).toHaveCount(0)

  // Missing configuration is handled before any database work or upload quota.
  const response = await page.request.post('/api/movie-uploads', { data: {} })
  expect(response.status()).toBe(503)
  expect((await response.json()).code).toBe('MOVIE_STORAGE_UNAVAILABLE')
})

for (const storageSucceeds of [true, false]) {
  test(storageSucceeds ? 'uploads using only the server-signed URL without browser storage keys' : 'keeps movie details and cleans up after a failed storage transfer', async ({ page }) => {
    let transferred = false
    let finalized = false
    let cleanedUp = false
    await page.route('**/api/movie-uploads**', async route => {
      switch (route.request().method()) {
        case 'GET': return route.fulfill({ json: { available: true } })
        case 'POST':
          expect(route.request().postDataJSON().mimeType).toBe('video/mp4')
          return route.fulfill({ status: 201, json: { movieId: 'test-movie', signedUrl } })
        case 'PATCH':
          expect(transferred).toBe(true)
          finalized = true
          return route.fulfill({ json: { movie: { tmdbId: null, watchProviders: [], watchRegion: 'US' } } })
        case 'DELETE':
          cleanedUp = true
          return route.fulfill({ json: { ok: true } })
      }
    })
    await page.route(signedUrl, async route => {
      const request = route.request()
      expect(request.method()).toBe('PUT')
      expect(request.headers()['content-type']).toBe('video/mp4')
      expect(request.headers().authorization).toBeUndefined()
      expect(request.headers().apikey).toBeUndefined()
      expect(request.headers().cookie).toBeUndefined()
      expect(request.postDataBuffer()).toEqual(movieBytes)
      transferred = true
      await route.fulfill({ status: storageSucceeds ? 200 : 500, json: storageSucceeds ? { Key: 'movie-uploads/test/movie.mp4' } : { error: 'Storage failure' } })
    })

    await gotoHydrated(page, '/creator')
    await page.getByRole('main').getByTestId('upload-movie-launcher').click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: 'UPLOAD YOUR MOVIE' })).toBeVisible()
    // Browsers sometimes omit MIME types for a valid movie extension.
    await dialog.locator('input[type="file"]').setInputFiles({ name: 'my-movie.mp4', mimeType: '', buffer: movieBytes })
    await dialog.getByRole('button', { name: 'Upload movie', exact: true }).click()

    if (storageSucceeds) {
      await expect(dialog.getByRole('heading', { name: 'YOUR MOVIE IS READY' })).toBeVisible()
      expect(finalized).toBe(true)
      expect(cleanedUp).toBe(false)
    } else {
      await expect(dialog.getByRole('alert')).toContainText('Could not upload your movie')
      await expect(dialog.getByLabel('Movie title')).toHaveValue('my movie')
      expect(cleanedUp).toBe(true)
      expect(finalized).toBe(false)
    }
  })
}
