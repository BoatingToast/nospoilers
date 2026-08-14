import assert from 'node:assert/strict'
import test from 'node:test'
// @ts-expect-error explicit TypeScript extension is intentional for node:test
import { canViewCollectionResource, redactLockedOptionalText, redactLockedText } from '../lib/content-visibility.ts'

test('locked spoiler text never enters the serialized response value', () => {
  const spoiler = 'The detective was the killer all along'

  assert.equal(redactLockedText(spoiler, false), '')
  assert.equal(redactLockedOptionalText(spoiler, false), null)
  assert.equal(redactLockedText(spoiler, true), spoiler)
})

test('private collections are visible only to their owner', () => {
  assert.equal(canViewCollectionResource(true, 'owner', null), true)
  assert.equal(canViewCollectionResource(false, 'owner', null), false)
  assert.equal(canViewCollectionResource(false, 'owner', 'someone-else'), false)
  assert.equal(canViewCollectionResource(false, 'owner', 'owner'), true)
})
