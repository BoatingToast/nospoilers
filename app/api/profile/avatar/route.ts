import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getSupabaseAdmin, AVATAR_BUCKET, buildAvatarUrl, extractStoragePath } from '@/lib/supabase-storage'

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_BYTES      = 5 * 1024 * 1024 // 5 MB

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
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Only JPG, PNG, and WEBP images are allowed' },
      { status: 400 },
    )
  }

  // Validate size
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: 'File exceeds 5 MB limit' },
      { status: 400 },
    )
  }

  const userId = session.user.id

  try {
    const supabase = getSupabaseAdmin()

    // Delete previous avatar if one exists
    const existing = await prisma.user.findUnique({
      where:  { id: userId },
      select: { avatarUrl: true },
    })
    if (existing?.avatarUrl) {
      const oldPath = extractStoragePath(existing.avatarUrl)
      if (oldPath) {
        await supabase.storage.from(AVATAR_BUCKET).remove([oldPath])
      }
    }

    // Upload new avatar — path: {userId}/{timestamp}.webp
    const ext       = file.type === 'image/png' ? 'png' : 'webp'
    const timestamp = Date.now()
    const path      = `${userId}/${timestamp}.${ext}`
    const buffer    = Buffer.from(await file.arrayBuffer())

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
