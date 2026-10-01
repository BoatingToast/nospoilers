import assert from 'node:assert/strict'
import test from 'node:test'
// Node 22 runs this erasable TypeScript test directly.
// @ts-expect-error explicit TypeScript extension is intentional for node:test
import { makeSpoilerFree } from '../services/spoiler-free.ts'

const fallback = 'A film worth discovering on your own terms.'

test('keeps at most two safe premise sentences', () => {
  const result = makeSpoilerFree(
    'A quiet cartographer is hired to map a remote island. She joins a small crew for the voyage. Their expedition changes the kingdom forever.',
  )

  assert.equal(
    result,
    'A quiet cartographer is hired to map a remote island. She joins a small crew for the voyage.',
  )
})

test('stops before reveal language', () => {
  const result = makeSpoilerFree(
    'A detective searches a mountain town for a missing traveler. She discovers that the mayor arranged the disappearance.',
  )

  assert.equal(result, 'A detective searches a mountain town for a missing traveler.')
  assert.doesNotMatch(result, /mayor|disappearance|discovers/i)
})

test('never reintroduces an unsafe raw prefix as a fallback', () => {
  const result = makeSpoilerFree('Turns out the trusted guide is actually the missing heir and betrays the group.')

  assert.equal(result, fallback)
  assert.doesNotMatch(result, /guide|heir|betrays/i)
})

test('cuts an outcome from a useful first-sentence premise', () => {
  const result = makeSpoilerFree(
    'An aging pilot crosses a flooded continent to bring medicine to an isolated city, but ultimately dies during the final landing.',
  )

  assert.match(result, /^An aging pilot crosses a flooded continent/)
  assert.doesNotMatch(result, /dies|final landing|ultimately/i)
  assert.ok(result.endsWith('…'))
})

test('treats a late-story pivot in the second sentence conservatively', () => {
  const result = makeSpoilerFree(
    'Two estranged sisters inherit a failing seaside hotel. However, their reunion exposes a secret identity hidden for decades.',
  )

  assert.equal(result, 'Two estranged sisters inherit a failing seaside hotel.')
})

test('normalizes whitespace and caps long descriptions on a word boundary', () => {
  const result = makeSpoilerFree(
    `  A musician travels across the country with an improvised orchestra, meeting performers who have kept their communities together through difficult years and finding new reasons to continue making art despite every obstacle placed in their path.   The ensemble prepares for one final concert.  `,
  )

  assert.ok(result.length <= 221)
  assert.doesNotMatch(result, /\s{2,}/)
  assert.ok(/[.!?…]$/.test(result))
})

test('uses a neutral fallback for missing or unusably short content', () => {
  assert.equal(makeSpoilerFree(null), fallback)
  assert.equal(makeSpoilerFree('Reveals the killer.'), fallback)
})
