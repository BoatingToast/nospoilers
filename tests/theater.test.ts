import assert from 'node:assert/strict'
import test from 'node:test'
// @ts-expect-error explicit TypeScript extension is intentional for node:test
import { parsePremiereInput, parseTheaterRating, theaterStatus, playbackPosition, nextAvailableSeat, normalizeTheaterAvatar, requiresTheaterRating, seatLabel } from '../lib/theater.ts'

const now = Date.parse('2026-09-07T12:00:00Z')
const input = {
  title: 'First Light', description: 'An independent short.', uploadId: 'my-upload',
  startsAt: '2026-09-07T09:00:00-04:00', durationSeconds: 180, capacity: 24, kind: 'film', promoted: false,
}

test('premiere times preserve timezone and derive the shared ending', () => {
  const premiere = parsePremiereInput(input, now)
  assert.equal(premiere.startsAt.toISOString(), '2026-09-07T13:00:00.000Z')
  assert.equal(premiere.endsAt.toISOString(), '2026-09-07T13:03:00.000Z')
  assert.equal(theaterStatus(premiere, now), 'upcoming')
  assert.equal(theaterStatus(premiere, premiere.startsAt.getTime()), 'live')
  assert.equal(theaterStatus(premiere, premiere.endsAt.getTime()), 'ended')
  assert.equal(theaterStatus({ ...premiere, cancelledAt: new Date(now) }, now), 'cancelled')
})

test('scheduling rejects malformed, past, unsupported, or unbounded inputs', () => {
  for (const patch of [
    { title: '' }, { title: 'x'.repeat(121) }, { startsAt: 'invalid' }, { startsAt: new Date(now).toISOString() },
    { durationSeconds: Infinity }, { durationSeconds: 0 }, { durationSeconds: 1.5 }, { durationSeconds: 14_401 },
    { capacity: 25 }, { capacity: '24' }, { kind: 'external' }, { promoted: 'yes' }, { promoted: true, adCopy: '' },
  ]) assert.throws(() => parsePremiereInput({ ...input, ...patch }, now))
  const ad = parsePremiereInput({ ...input, kind: 'trailer', promoted: true, adCopy: ' A first look. ' }, now)
  assert.equal(ad.adCopy, 'A first look.')
})

test('late arrivals join the live position, clamped to the screening window', () => {
  assert.equal(playbackPosition(new Date(now), 90, now - 10_000), 0)
  assert.equal(playbackPosition(new Date(now), 90, now + 43_500), 43.5)
  assert.equal(playbackPosition(new Date(now), 90, now + 100_000), 90)
})

test('each theater size allocates every seat exactly once and then reports full', () => {
  for (const capacity of [24, 48, 96]) {
    const seats: number[] = []
    for (let i = 0; i < capacity; i++) {
      const seat = nextAvailableSeat(capacity, seats)
      assert.notEqual(seat, null)
      assert.ok(!seats.includes(seat!))
      assert.ok(seat! >= 0 && seat! < capacity)
      seats.push(seat!)
    }
    assert.equal(nextAvailableSeat(capacity, seats), null)
  }
  assert.equal(seatLabel(0), 'A1')
  assert.equal(seatLabel(95), 'L8')
})

test('ratings remain required after watched screenings until rated, excluding creators and cancellations', () => {
  const attendance = { watchedAt: new Date(now), rating: null, isOwner: false, status: 'ended' as const }
  assert.equal(requiresTheaterRating(attendance), true)
  assert.equal(requiresTheaterRating({ ...attendance, rating: 1 }), false)
  assert.equal(requiresTheaterRating({ ...attendance, watchedAt: null }), false)
  assert.equal(requiresTheaterRating({ ...attendance, isOwner: true }), false)
  assert.equal(requiresTheaterRating({ ...attendance, status: 'cancelled' }), false)
  assert.equal(requiresTheaterRating({ ...attendance, status: 'live' }), false)
  for (const rating of [0, 6, 2.5, '5', null, NaN]) assert.throws(() => parseTheaterRating(rating))
  assert.equal(parseTheaterRating(5), 5)
})

test('shared avatar data is limited to validated colors and supported shapes', () => {
  const avatar = normalizeTheaterAvatar({ skin: 'url(https://example.test)', suit: '#102030', accent: '#ffffff', accessory: 'halo', silhouette: 'cosmic', unsafe: 'ignored' })
  assert.equal(avatar.skin, '#b76e52')
  assert.equal(avatar.suit, '#102030')
  assert.equal(avatar.accessory, 'halo')
  assert.equal('unsafe' in avatar, false)
})
