import { expect, test, type Page } from '@playwright/test'
import { gotoHydrated, mockSignedOutSession } from './support/session'

test.beforeEach(async ({ page }) => {
  await mockSignedOutSession(page)
  await page.route('**/api/theater', route => route.fulfill({ json: { premieres: [], pendingRatingId: null } }))
})

test('spawns in the multiplex lobby and offers a screening room through showtimes', async ({ page }) => {
  await gotoHydrated(page, '/theater')
  await expect(page.getByRole('img', { name: /Walkable cinema lobby/ })).toBeVisible()
  await expect(page.getByText('8 screening rooms', { exact: false })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Move forward' })).toBeVisible()
  await page.getByRole('button', { name: 'Showtimes', exact: true }).click()
  await page.getByRole('link', { name: /Theater 01/ }).click()
  await expect(page.getByRole('img', { name: /First-person theater/ })).toBeVisible()
  await page.getByRole('button', { name: /Back to lobby|Lobby/, exact: false }).click()
  await expect(page.getByRole('img', { name: /Walkable cinema lobby/ })).toBeVisible()
})

test('arrow keys move through the lobby to a door and E enters its screening room', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'), 'Keyboard walking is covered on desktop; mobile uses the visible controls.')
  await gotoHydrated(page, '/theater')
  const canvas = page.getByRole('img', { name: /Walkable cinema lobby/ })
  await expect(canvas).toBeVisible()
  await page.getByRole('button', { name: 'Dismiss walking instructions' }).click()
  await canvas.focus()
  await page.keyboard.down('ArrowUp')
  await page.waitForTimeout(1200)
  await page.keyboard.up('ArrowUp')
  await page.keyboard.down('ArrowLeft')
  try { await expect(page.getByRole('button', { name: /Enter theater/ })).toBeVisible({ timeout: 6000 }) }
  finally { await page.keyboard.up('ArrowLeft') }
  await page.keyboard.press('e')
  await expect(page.getByRole('img', { name: /First-person theater/ })).toBeVisible()
})

function roomFixture(owner = false, ended = false, rated = false) {
  return {
    premiere: { id: 'fixture', title: 'First Light', description: 'An independent short.', kind: 'film', startsAt: ended ? '2020-01-01T00:00:00Z' : '2099-01-01T00:00:00Z', endsAt: ended ? '2020-01-01T00:02:00Z' : '2099-01-01T00:02:00Z', durationSeconds: 120, capacity: 24, promoted: false, adCopy: null, status: ended ? 'ended' : 'upcoming', creatorName: 'Indie Creator', isOwner: owner, reservedSeats: 1 },
    serverNow: new Date().toISOString(), viewerId: owner ? 'creator' : 'viewer',
    participants: [{ userId: 'viewer', name: 'Avery', seat: 11, present: true, avatar: { skin: '#b76e52', suit: '#151d46', accent: '#9d7cff', accessory: 'halo', silhouette: 'classic' } }],
    mySeat: owner ? null : 11, myRating: rated ? 4 : null, ratingRequired: !owner && ended && !rated, pendingRatingId: !owner && ended && !rated ? 'fixture' : null,
    ratingSummary: owner ? { count: 0, average: null } : null,
  }
}

async function mockRoom(page: Page, owner = false) {
  await page.route('**/api/theater/fixture', route => route.fulfill({ json: route.request().method() === 'POST' ? { ok: true } : roomFixture(owner) }))
}

test('creators enter the overview and can switch to an audience seat', async ({ page }) => {
  await mockRoom(page, true)
  await gotoHydrated(page, '/theater/fixture?enter=1')
  await expect(page.getByRole('img', { name: /3D creator overview/ })).toBeVisible()
  await page.getByRole('button', { name: 'Try a seat', exact: true }).click()
  await expect(page.getByRole('img', { name: /First-person theater/ })).toBeVisible()
  await page.getByRole('button', { name: 'Show audience' }).click()
  await expect(page.getByRole('complementary', { name: 'Theater audience' }).getByText('Avery', { exact: true })).toBeVisible()
})

test('a required rating survives reload and Escape, then unlocks after submission', async ({ page }) => {
  let rated = false
  let failSubmission = true
  await page.route('**/api/theater/fixture', async route => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON()
      expect(body.action).toBe('rate')
      expect(body.rating).toBe(4)
      if (failSubmission) { failSubmission = false; await route.fulfill({ status: 503, json: { error: 'Try submitting again.' } }); return }
      rated = true
      await route.fulfill({ json: { ok: true } })
      return
    }
    await route.fulfill({ json: roomFixture(false, true, rated) })
  })
  await gotoHydrated(page, '/theater/fixture')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeVisible()
  await page.reload()
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Submit rating & finish' })).toBeDisabled()
  await dialog.getByRole('radio', { name: '4 stars' }).check()
  await dialog.getByRole('button', { name: 'Submit rating & finish' }).click()
  await expect(dialog.getByRole('alert')).toContainText('Try submitting again.')
  await dialog.getByRole('button', { name: 'Submit rating & finish' }).click()
  await expect(dialog).not.toBeVisible()
  await expect(page.getByText('Thank you for your 4-star rating.')).toBeVisible()
})
