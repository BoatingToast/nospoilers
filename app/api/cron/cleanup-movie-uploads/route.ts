import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { MOVIE_UPLOAD_BUCKET } from '@/lib/movie-uploads'
import { ensureMovieUploadBucket } from '@/lib/supabase-storage'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET
  if (!expected || request.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const expiredRateLimits = await prisma.rateLimitBucket.deleteMany({
    where: { expiresAt: { lt: now } },
  })
  const staleUploads = await prisma.uploadedMovie.findMany({
    where: {
      status: 'uploading',
      createdAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
    },
    select: { id: true, storagePath: true },
    orderBy: { createdAt: 'asc' },
    take: 100,
  })

  if (staleUploads.length === 0) {
    return NextResponse.json({ removed: 0, expiredRateLimits: expiredRateLimits.count })
  }

  try {
    const supabase = await ensureMovieUploadBucket()
    const { error } = await supabase.storage
      .from(MOVIE_UPLOAD_BUCKET)
      .remove(staleUploads.map(upload => upload.storagePath))
    if (error) throw error

    const result = await prisma.uploadedMovie.deleteMany({
      where: { id: { in: staleUploads.map(upload => upload.id) }, status: 'uploading' },
    })
    return NextResponse.json({
      removed: result.count,
      expiredRateLimits: expiredRateLimits.count,
    })
  } catch (error) {
    console.error('[cron/cleanup-movie-uploads]', error)
    return NextResponse.json({ error: 'Upload cleanup failed' }, { status: 500 })
  }
}
