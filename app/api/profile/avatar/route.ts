import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  AVATAR_MAX_BYTES,
  AVATAR_MIME_TYPES,
  buildDatabaseAvatarUrl,
  ensureAvatarImageTable,
  hasValidImageSignature,
} from '@/lib/avatar-storage'

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
    const buffer = Buffer.from(await file.arrayBuffer())

    if (!hasValidImageSignature(buffer, file.type)) {
      return NextResponse.json({ error: 'The selected file is not a valid image' }, { status: 400 })
    }

    await ensureAvatarImageTable()

    // The versioned URL gives every replacement a fresh immutable cache key.
    const publicUrl = buildDatabaseAvatarUrl(userId, Date.now())
    await prisma.$transaction([
      prisma.avatarImage.upsert({
        where:  { userId },
        update: { data: buffer, contentType: file.type },
        create: { userId, data: buffer, contentType: file.type },
      }),
      prisma.user.update({
        where: { id: userId },
        data:  { avatarUrl: publicUrl },
      }),
    ])

    return NextResponse.json({ url: publicUrl })
  } catch (err) {
    console.error('Avatar upload error:', err)
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 })
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
    await ensureAvatarImageTable()
    await prisma.$transaction([
      prisma.avatarImage.deleteMany({ where: { userId } }),
      prisma.user.update({
        where: { id: userId },
        data:  { avatarUrl: null },
      }),
    ])

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Avatar delete error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
