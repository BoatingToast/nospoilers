import { createClient } from '@supabase/supabase-js'
import { MAX_MOVIE_BYTES, MOVIE_MIME_TYPES, MOVIE_UPLOAD_BUCKET } from './movie-uploads'

export const AVATAR_BUCKET = 'avatars'

/**
 * Makes the creator-upload bucket self-configuring in new environments. Existing
 * projects keep their current bucket settings; new buckets are public so the
 * upcoming Reels feed can stream finished movies without proxying video bytes.
 */
export async function ensureMovieUploadBucket() {
  const supabase = getSupabaseAdmin()
  const { data: bucket } = await supabase.storage.getBucket(MOVIE_UPLOAD_BUCKET)

  if (!bucket) {
    const { error } = await supabase.storage.createBucket(MOVIE_UPLOAD_BUCKET, {
      public: true,
      fileSizeLimit: MAX_MOVIE_BYTES,
      allowedMimeTypes: [...MOVIE_MIME_TYPES],
    })

    // Another request may have created the bucket between getBucket and here.
    if (error && !/already exists|duplicate/i.test(error.message)) throw error
  }

  return supabase
}

/**
 * Returns a Supabase admin client (service role — server-side only).
 * Throws clearly if env vars are not configured.
 */
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'Supabase not configured. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local.\n' +
      'See SETUP_GUIDE.md for Supabase Storage setup instructions.',
    )
  }

  return createClient(url, key, { auth: { persistSession: false } })
}

/**
 * Constructs the full public URL for an object in the avatars bucket.
 * @param storagePath  The path inside the bucket, e.g. "abc123/1712345678.webp"
 */
export function buildAvatarUrl(storagePath: string): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
  return `${url}/storage/v1/object/public/${AVATAR_BUCKET}/${storagePath}`
}

/**
 * Extracts the storage path from a full Supabase public URL.
 * e.g. "https://xxx.supabase.co/storage/v1/object/public/avatars/uid/ts.webp"
 *   → "uid/ts.webp"
 */
export function extractStoragePath(publicUrl: string): string | null {
  const marker = `/storage/v1/object/public/${AVATAR_BUCKET}/`
  const idx = publicUrl.indexOf(marker)
  if (idx === -1) return null
  return publicUrl.slice(idx + marker.length)
}
