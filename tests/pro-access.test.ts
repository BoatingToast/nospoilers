import assert from 'node:assert/strict'
import test from 'node:test'
// @ts-expect-error explicit TypeScript extension is intentional for node:test
import { hasProAccess } from '../lib/pro-access.ts'

test('grants Pro access only to the allowlisted account', () => {
  assert.equal(hasProAccess('emoon0108@gmail.com'), true)
  assert.equal(hasProAccess('  EMOON0108@GMAIL.COM '), true)
  assert.equal(hasProAccess('someone@example.com'), false)
  assert.equal(hasProAccess('emoon0108+test@gmail.com'), false)
  assert.equal(hasProAccess(null), false)
})
