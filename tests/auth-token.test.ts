import assert from 'node:assert/strict'
import test from 'node:test'
import { encode } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'
// @ts-expect-error explicit TypeScript extension is intentional for node:test
import { getToken } from '../lib/get-auth-token.ts'

const secret = 'test-secret-for-auth-cookie-detection'
process.env.NEXTAUTH_SECRET = secret

async function makeToken(id: string): Promise<string> {
  return encode({ secret, token: { id, image: null, onboardingCompleted: true } })
}

function makeRequest(name: string, value: string): NextRequest {
  return {
    cookies: { getAll: () => [{ name, value }] },
    headers: new Headers(),
  } as unknown as NextRequest
}

test('reads an unprefixed session cookie in a production-style request', async () => {
  const jwt = await makeToken('unprefixed-user')
  const req = makeRequest('next-auth.session-token', jwt)

  const token = await getToken({ req })

  assert.equal(token?.id, 'unprefixed-user')
})

test('reads a secure-prefixed session cookie', async () => {
  const jwt = await makeToken('secure-user')
  const req = makeRequest('__Secure-next-auth.session-token', jwt)

  const token = await getToken({ req })

  assert.equal(token?.id, 'secure-user')
})
