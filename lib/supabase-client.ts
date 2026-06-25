/**
 * Browser-only Supabase client — used for Realtime subscriptions in the Spoiler Zone.
 * The anon key is safe to expose client-side; it only permits what the bucket/channel policies allow.
 *
 * Usage:
 *   const client = getSupabasePublicClient()
 *   if (!client) { /* fallback to polling *\/ }
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

export function getSupabasePublicClient(): SupabaseClient | null {
  // Guard: never run on the server
  if (typeof window === 'undefined') return null

  if (_client) return _client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    // Realtime is unavailable — consumers should fall back to HTTP polling
    return null
  }

  _client = createClient(url, key, {
    realtime: { params: { eventsPerSecond: 10 } },
  })

  return _client
}
