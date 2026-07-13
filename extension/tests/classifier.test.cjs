const assert = require('node:assert/strict')
const test = require('node:test')

const { classifyText, matchingTitle } = require('../classifier.js')
const { normalizeSettings, isDomainPaused } = require('../shared.js')

const balanced = {
  protectedTitles: ['Dune: Part Two'],
  sensitivity: 'balanced',
  blockGenericSpoilers: false,
}

test('balanced mode blocks a protected title with spoiler language', () => {
  assert.deepEqual(
    classifyText('Dune: Part Two ending explained and final scene breakdown', balanced),
    { blocked: true, title: 'Dune: Part Two', reason: 'likely-spoiler' },
  )
})

test('balanced mode leaves harmless protected-title mentions visible', () => {
  assert.equal(
    classifyText('Dune: Part Two has a beautiful score and cast.', balanced).blocked,
    false,
  )
})

test('unrelated spoiler language stays visible by default', () => {
  assert.equal(
    classifyText('The ending explained in five minutes.', balanced).blocked,
    false,
  )
})

test('generic mode blocks high-confidence phrases without a title', () => {
  assert.equal(
    classifyText('Major spoiler alert: the ending explained.', {
      ...balanced,
      blockGenericSpoilers: true,
    }).blocked,
    true,
  )
})

test('strict and relaxed sensitivity use different thresholds', () => {
  assert.equal(classifyText('Dune: Part Two cast interview', {
    ...balanced,
    sensitivity: 'strict',
  }).blocked, true)

  assert.equal(classifyText('Dune: Part Two character dies', {
    ...balanced,
    sensitivity: 'relaxed',
  }).blocked, false)
})

test('short titles match complete words instead of substrings', () => {
  assert.equal(matchingTitle('An Up retrospective', ['Up']), 'Up')
  assert.equal(matchingTitle('Pickup basketball highlights', ['Up']), null)
})

test('settings normalization deduplicates titles and domains', () => {
  const settings = normalizeSettings({
    protectedTitles: [' Dune ', 'dune', 'Severance'],
    pausedDomains: ['https://www.youtube.com/feed', 'youtube.com'],
    sensitivity: 'unknown',
  })
  assert.deepEqual(settings.protectedTitles, ['Dune', 'Severance'])
  assert.deepEqual(settings.pausedDomains, ['youtube.com'])
  assert.equal(settings.sensitivity, 'balanced')
  assert.equal(isDomainPaused('music.youtube.com', settings.pausedDomains), true)
})
