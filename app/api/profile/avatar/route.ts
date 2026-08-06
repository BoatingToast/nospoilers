import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  AVATAR_BUCKET,
  AVATAR_MAX_BYTES,
  AVATAR_MIME_TYPES,
  buildAvatarUrl,
  ensureAvatarBucket,
  extractStoragePath,
  getSupabaseAdmin,
} from '@/lib/supabase-storage'

function hasValidImageSignature(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === 'image/jpeg') {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  }
  if (mimeType === 'image/png') {
    return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  }
  if (mimeType === 'image/webp') {
    return buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP'
  }
  return false
}

// ── POST /api/profile/avatar ──────────────────────────────────────────────────
// Body: FormData with field "file" (Blob/File)
// Returns: { url: string }

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  // Validate MIME type
  if (!AVATAR_MIME_TYPES.includes(file.type as (typeof AVATAR_MIME_TYPES)[number])) {
    return NextResponse.json(
      { error: 'Only JPG, PNG, and WEBP images are allowed' },
      { status: 400 },
    )
  }

  // Validate size
  if (file.size > AVATAR_MAX_BYTES) {
    return NextResponse.json(
      { error: 'File exceeds 5 MB limit' },
      { status: 400 },
    )
  }

  const userId = session.user.id

  try {
    const supabase = await ensureAvatarBucket()
    const buffer = Buffer.from(await file.arrayBuffer())

    if (!hasValidImageSignature(buffer, file.type)) {
      return NextResponse.json({ error: 'The selected file is not a valid image' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({
      where:  { id: userId },
      select: { avatarUrl: true },
    })

    // Upload the replacement before deleting the old image, so a failed upload
    // never leaves the user's current profile picture pointing at a missing file.
    const ext       = file.type === 'image/png' ? 'png' : file.type === 'image/jpeg' ? 'jpg' : 'webp'
    const timestamp = Date.now()
    const path      = `${userId}/${timestamp}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, buffer, {
        contentType: file.type,
        upsert:      false,
      })

    if (uploadError) {
      console.error('Supabase upload error:', uploadError)
      return NextResponse.json(
        { error: 'Upload failed. Please try again.' },
        { status: 500 },
      )
    }

    // Build public URL and persist
    const publicUrl = buildAvatarUrl(path)
    await prisma.user.update({
      where: { id: userId },
      data:  { avatarUrl: publicUrl },
    })

    if (existing?.avatarUrl) {
      const oldPath = extractStoragePath(existing.avatarUrl)
      if (oldPath && oldPath !== path) {
        // Cleanup is best-effort; the newly saved avatar should still succeed.
        await supabase.storage.from(AVATAR_BUCKET).remove([oldPath]).catch(() => {})
      }
    }

    return NextResponse.json({ url: publicUrl })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message.includes('not configured')) {
      return NextResponse.json(
        { error: 'Storage not configured. See SETUP_GUIDE.md.' },
        { status: 503 },
      )
    }
    console.error('Avatar upload error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// ── DELETE /api/profile/avatar ────────────────────────────────────────────────
// Removes the avatar from storage and clears avatarUrl in the DB.

export async function DELETE() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  try {
    const user = await prisma.user.findUnique({
      where:  { id: userId },
      select: { avatarUrl: true },
    })

    if (user?.avatarUrl) {
      const path = extractStoragePath(user.avatarUrl)
      if (path) {
        const supabase = getSupabaseAdmin()
        await supabase.storage.from(AVATAR_BUCKET).remove([path])
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data:  { avatarUrl: null },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Avatar delete error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
