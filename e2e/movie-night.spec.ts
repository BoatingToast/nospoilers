import { expect, test, type Page } from '@playwright/test'
import { gotoHydrated, mockSignedOutSession } from './support/session'

const code = 'ABC123'
const candidates = [
  {
    id: 'candidate-1', tmdbId: 603, title: 'The Matrix', posterPath: null,
    releaseDate: '1999-03-31', genreIds: [28, 878], runtime: 136,
    voteAverage: 8.2, groupFit: 91, explanation: 'A strong shared fit.',
    position: 0, voteCount: 0, myVote: null,
  },
  {
    id: 'candidate-2', tmdbId: 550, title: 'Fight Club', posterPath: null,
    releaseDate: '1999-10-15', genreIds: [18], runtime: 139,
    voteAverage: 8.4, groupFit: 84, explanation: 'Another group favorite.',
    position: 1, voteCount: 0, myVote: null,
  },
]

function room(status: 'lobby' | 'voting', participantId: string | null) {
  const participants = [
    { id: 'host', displayName: 'Host', avatarUrl: null, isHost: true, voteCount: 0, finished: false },
    { id: 'guest', displayName: 'Jamie', avatarUrl: null, isHost: false, voteCount: 0, finished: false },
  ]

  return {
    code,
    name: 'Friday Movie Night',
    mood: 'crowd',
    status,
    expiresAt: '2099-01-01T00:00:00.000Z',
    participantId,
    participantCount: participants.length,
    candidates,
    participants,
    matchedCandidate: null,
    matchKind: null,
  }
}

async function mockRoom(page: Page, state: { status: 'lobby' | 'voting'; participantId: string | null }) {
  await page.route(`**/api/movie-night/rooms/${code}`, route => route.fulfill({
    json: room(state.status, state.participantId),
  }))
}

test.beforeEach(async ({ page }) => {
  await mockSignedOutSession(page)
})

test('host sees the complete lobby roster and starts voting for the room', async ({ page }) => {
  const state: { status: 'lobby' | 'voting'; participantId: string | null } = {
    status: 'lobby',
    participantId: 'host',
  }
  await page.addInitScript(({ roomCode }) => {
    window.localStorage.setItem(`nospoilers:movie-night:${roomCode}`, 'host-token')
  }, { roomCode: code })
  await mockRoom(page, state)
  await page.route(`**/api/movie-night/rooms/${code}/start`, async route => {
    state.status = 'voting'
    await route.fulfill({ json: { ok: true } })
  })

  await gotoHydrated(page, `/movie-night/${code}`)
  await expect(page.getByRole('heading', { name: 'GET EVERYONE IN' })).toBeVisible()
  const roster = page.getByRole('complementary')
  await expect(roster.getByText('Host', { exact: true }).first()).toBeVisible()
  await expect(roster.getByText('Jamie', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Start voting' }).click()
  await expect(page.getByRole('heading', { name: 'The Matrix' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Watch' })).toBeVisible()
})

test('guest waits in the lobby and automatically enters voting when the host starts', async ({ page }) => {
  const state: { status: 'lobby' | 'voting'; participantId: string | null } = {
    status: 'lobby',
    participantId: 'guest',
  }
  await page.addInitScript(({ roomCode }) => {
    window.localStorage.setItem(`nospoilers:movie-night:${roomCode}`, 'guest-token')
  }, { roomCode: code })
  await mockRoom(page, state)

  await gotoHydrated(page, `/movie-night/${code}`)
  await expect(page.getByText('Waiting for the host to start')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start voting' })).toHaveCount(0)

  state.status = 'voting'
  await expect(page.getByRole('heading', { name: 'The Matrix' })).toBeVisible({ timeout: 5_000 })

  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }))
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport)
})
