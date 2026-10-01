import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import { encode } from 'next-auth/jwt'
import { gotoHydrated, mockMemberSession } from './support/session'

const OPTIONS = {
  relationships: 'The people and how they relate to each other',
  ideas: 'The concepts and how it thinks them through',
  atmosphere: 'The mood and the world it builds',
  momentum: 'How quickly it moves',
  tension: 'The suspense it holds',
  humor: 'How funny or light it is',
}

// The same priorities the fixture describes for its two sample viewers.
const MAYA = [OPTIONS.relationships, OPTIONS.atmosphere, OPTIONS.humor]
const JONAH = [OPTIONS.ideas, OPTIONS.momentum, OPTIONS.tension]

async function signInAsPro(page: Page, context: BrowserContext, baseURL: string) {
  await mockMemberSession(page)
  await page.route('**/api/notifications**', route => route.fulfill({ json: { count: 0, notifications: [] } }))
  const token = await encode({
    secret: 'nospoilers-e2e-secret',
    token: { id: 'e2e-pro-user', email: 'emoon0108@gmail.com', name: 'Pro tester', image: null, onboardingCompleted: true },
    maxAge: 3600,
  })
  await context.addCookies([{ name: 'next-auth.session-token', value: token, url: baseURL, httpOnly: true, sameSite: 'Lax' }])
}

async function confirmFilms(page: Page) {
  for (const title of ['Interstellar', 'Blade Runner 2049', 'Arrival', 'Parasite', 'Mad Max: Fury Road', 'Her']) {
    await page.getByRole('button', { name: title, exact: true }).click()
  }
  await page.getByRole('button', { name: 'Ask me about these' }).click()
}

/** Answer every question the way a viewer with these priorities would. */
async function answerAs(page: Page, priorities: string[]) {
  const results = page.getByRole('heading', { name: 'Three hypotheses. Correct any of them.' })
  for (let asked = 0; asked < 3; asked++) {
    const counter = page.getByText(`Question ${asked + 1} of up to 3`)
    await expect(counter.or(results)).toBeVisible()
    if (await results.isVisible()) return

    const offered: string[] = []
    for (const label of priorities) {
      if (await page.getByRole('button', { name: label, exact: true }).count()) offered.push(label)
    }
    const topTwo = priorities.slice(0, 2).filter(label => offered.includes(label))
    if (topTwo.length === 2) await page.getByRole('button', { name: 'Both', exact: true }).click()
    else if (offered.length > 0) await page.getByRole('button', { name: offered[0], exact: true }).click()
    else await page.getByRole('button', { name: 'Neither', exact: true }).click()
  }
  await expect(results).toBeVisible()
}

async function pickTitles(page: Page): Promise<string[]> {
  return page.locator('article[data-role] h4').allTextContents()
}

test.beforeEach(async ({ page, context, baseURL }) => {
  test.skip(Boolean(process.env.E2E_BASE_URL) && !process.env.E2E_PRO_TEST_SESSION, 'Requires the local test server with its fixture session secret.')
  await signInAsPro(page, context, baseURL!)
})

test('two viewers with the same ratings get different picks for stated reasons', async ({ page }) => {
  await gotoHydrated(page, '/pro/taste-lab?demo=1')
  await expect(page.getByRole('heading', { name: 'Why did I love that?' })).toBeVisible()
  await expect(page.getByText('Fixture mode: sample ratings, not yours')).toBeVisible()
  await expect(page.getByText('Built-in wording: live AI is not configured')).toBeVisible()

  await confirmFilms(page)
  await expect(page.getByRole('heading', { name: 'What made Interstellar work for you?' })).toBeVisible()
  await expect(page.getByText(/show up together in 4 of the 6 films you rated highest/)).toBeVisible()
  await answerAs(page, MAYA)

  await expect(page.getByText('The relationships look like a main thing you come for.')).toBeVisible()
  await expect(page.locator('article[data-role]')).toHaveCount(3)
  const maya = await pickTitles(page)

  await page.getByRole('button', { name: 'Start over' }).click()
  await confirmFilms(page)
  await answerAs(page, JONAH)

  await expect(page.getByText('Big ideas look like a main thing you come for.')).toBeVisible()
  const jonah = await pickTitles(page)
  expect(jonah).toHaveLength(3)
  expect(jonah.filter(title => maya.includes(title))).toHaveLength(0)

  // Picks never carry a percentage.
  await expect(page.locator('article[data-role]').filter({ hasText: '%' })).toHaveCount(0)
})

test('corrections rerank immediately and temporary changes stay temporary', async ({ page }) => {
  await gotoHydrated(page, '/pro/taste-lab?demo=1')
  await confirmFilms(page)
  await answerAs(page, MAYA)
  const before = await pickTitles(page)

  await page.getByLabel('Tell it what it got wrong').fill('I liked the atmosphere, not the violence')
  await page.getByRole('button', { name: 'Apply' }).click()
  const changed = page.getByRole('status', { name: 'What changed' })
  await expect(changed).toContainText('more atmosphere, less dark intensity')
  await expect(changed).toContainText('Dark intensity:')

  // The ledger records where the change came from, in the member's own words.
  await page.getByText(/^From .*your correction/).first().click()
  await expect(page.getByText('You said: “not the violence”').first()).toBeVisible()

  await page.getByRole('button', { name: 'Faster pacing' }).click()
  await expect(page.getByText('This session only')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Faster pacing' })).toHaveAttribute('aria-pressed', 'true')
  await expect(changed).toContainText('faster pacing. Temporary.')
  const tweaked = await pickTitles(page)
  expect(tweaked).not.toEqual(before)

  await page.getByRole('button', { name: 'Clear it' }).click()
  await expect(page.getByText('This session only')).toHaveCount(0)

  // Fixture mode never offers to write to the account.
  await expect(page.getByRole('button', { name: 'Save to my Movie DNA' })).toHaveCount(0)
  await expect(page.getByText('Sample ratings. Nothing here is written to your account.')).toBeVisible()
})

test('spoiler mode controls what a pick reveals and the layout fits the screen', async ({ page }) => {
  await gotoHydrated(page, '/pro/taste-lab?demo=1')
  await confirmFilms(page)
  await answerAs(page, JONAH)

  const picks = page.locator('article[data-role]')
  await expect(picks.first().getByText(/^Catalog:/).first()).toBeVisible()
  await expect(page.getByText('Loading premise…')).toHaveCount(0)

  let storyRequests = 0
  page.on('request', request => {
    if (request.url().includes('/api/pro/taste-reasons/story')) storyRequests += 1
  })
  await page.getByRole('button', { name: 'Blind', exact: true }).click()
  await expect(page.getByText(/^Catalog:/)).toHaveCount(0)
  await expect(picks.first().getByText(/^Strong on /).first()).toBeVisible()
  expect(storyRequests).toBe(0)

  for (const text of await picks.allTextContents()) {
    expect(text).not.toMatch(/twist|ending|dies|reveal/i)
  }

  const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }))
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport)
})
