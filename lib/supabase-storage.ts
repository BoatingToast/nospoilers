import { createClient } from '@supabase/supabase-js'
import { MAX_MOVIE_BYTES, MOVIE_MIME_TYPES, MOVIE_UPLOAD_BUCKET } from './movie-uploads'

/**
 * Makes the creator-upload bucket self-configuring in new environments. Existing
 * projects are reconciled to the same private, size-limited policy. Consumers
 * must use short-lived signed download URLs to stream approved movies.
 */
export async function ensureMovieUploadBucket() {
  const supabase = getSupabaseAdmin()
  const { data: bucket } = await supabase.storage.getBucket(MOVIE_UPLOAD_BUCKET)

  if (!bucket) {
    const { error } = await supabase.storage.createBucket(MOVIE_UPLOAD_BUCKET, {
      public: false,
      fileSizeLimit: MAX_MOVIE_BYTES,
      allowedMimeTypes: [...MOVIE_MIME_TYPES],
    })

    // Another request may have created the bucket between getBucket and here.
    if (error && !/already exists|duplicate/i.test(error.message)) throw error
  } else if (
    bucket.public ||
    Number(bucket.file_size_limit) !== MAX_MOVIE_BYTES ||
    !MOVIE_MIME_TYPES.every(type => bucket.allowed_mime_types?.includes(type))
  ) {
    const { error } = await supabase.storage.updateBucket(MOVIE_UPLOAD_BUCKET, {
      public: false,
      fileSizeLimit: MAX_MOVIE_BYTES,
      allowedMimeTypes: [...MOVIE_MIME_TYPES],
    })
    if (error) throw error
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
      'Supabase not configured. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local.',
    )
  }

  return createClient(url, key, { auth: { persistSession: false } })
}
