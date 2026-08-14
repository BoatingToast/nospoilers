import { expect, test } from '@playwright/test'
import { gotoHydrated, mockSignedOutSession } from './support/session'

const favoriteMovies = Array.from({ length: 5 }, (_, index) => ({
  id: 100 + index,
  title: `Fixture Favorite ${index + 1}`,
  original_title: `Fixture Favorite ${index + 1}`,
  overview: 'A spoiler-free fixture movie.',
  poster_path: null,
  backdrop_path: null,
  release_date: `200${index}-01-01`,
  genre_ids: [18],
  adult: false,
  original_language: 'en',
  popularity: 10,
  vote_average: 8,
  vote_count: 100,
  video: false,
}))

test('onboarding saves favorites and exposes a recoverable completion error', async ({ page }) => {
  await mockSignedOutSession(page)
  await page.route('**/api/movies/search?**', route => route.fulfill({
    json: { page: 1, results: favoriteMovies, total_pages: 1, total_results: favoriteMovies.length },
  }))

  let savedMovies: unknown
  await page.route('**/api/onboarding/save-movies', async route => {
    savedMovies = route.request().postDataJSON()
    await route.fulfill({ json: { success: true } })
  })
  await page.route('**/api/onboarding/complete', route => route.fulfill({
    status: 503,
    json: { error: 'Movie DNA service is temporarily unavailable.' },
  }))

  await gotoHydrated(page, '/onboarding')
  await expect(page.getByRole('heading', { name: 'FAVORITE FILMS' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Continue/ })).toBeDisabled()

  for (const movie of favoriteMovies) {
    await page.getByPlaceholder('Search for a movie...').fill('fixture')
    await page.getByRole('button', { name: new RegExp(movie.title) }).click()
  }

  await page.getByRole('button', { name: /Continue/ }).click()
  await expect.poll(() => savedMovies).toEqual({
    movies: favoriteMovies.map(movie => ({
      tmdbId: movie.id,
      title: movie.title,
      posterPath: movie.poster_path,
      releaseDate: movie.release_date,
      genreIds: movie.genre_ids,
    })),
  })

  await expect(page.getByRole('heading', { name: 'YOUR GENRES' })).toBeVisible()
  await page.getByRole('button', { name: 'Drama' }).click()
  await page.getByRole('button', { name: /Continue/ }).click()

  await expect(page.getByRole('heading', { name: 'YOUR PREFERENCES' })).toBeVisible()
  await page.getByRole('button', { name: /Generate My DNA/ }).click()
  await expect(page.getByText('Movie DNA service is temporarily unavailable.')).toBeVisible()
  await expect(page.getByRole('button', { name: /Generate My DNA/ })).toBeEnabled()
})
