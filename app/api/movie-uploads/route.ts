import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  MAX_MOVIE_BYTES,
  MAX_MOVIE_DESCRIPTION_LENGTH,
  MAX_MOVIE_TITLE_LENGTH,
  MOVIE_UPLOAD_BUCKET,
  movieExtensionForMimeType,
  normalizeMovieMimeType,
} from '@/lib/movie-uploads'
import { ensureMovieUploadBucket } from '@/lib/supabase-storage'

export const runtime = 'nodejs'

interface StartUploadBody {
  title?: unknown
  description?: unknown
  fileName?: unknown
  fileSize?: unknown
  mimeType?: unknown
}

async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return await request.json() as T
  } catch {
    return null
  }
}

function storageUnavailable(error: unknown) {
  return error instanceof Error && error.message.includes('not configured')
}

// Start a direct-to-storage upload and return a short-lived, single-file token.
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await readJson<StartUploadBody>(request)
  if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })

  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const description = typeof body.description === 'string' ? body.description.trim() : ''
  const fileName = typeof body.fileName === 'string' ? body.fileName.trim() : ''
  const fileSize = typeof body.fileSize === 'number' ? body.fileSize : NaN
  const suppliedMimeType = typeof body.mimeType === 'string' ? body.mimeType : ''
  const mimeType = normalizeMovieMimeType(suppliedMimeType, fileName)

  if (!title) return NextResponse.json({ error: 'Add a title for your movie' }, { status: 400 })
  if (title.length > MAX_MOVIE_TITLE_LENGTH) {
    return NextResponse.json({ error: `Title must be ${MAX_MOVIE_TITLE_LENGTH} characters or fewer` }, { status: 400 })
  }
  if (description.length > MAX_MOVIE_DESCRIPTION_LENGTH) {
    return NextResponse.json({ error: `Description must be ${MAX_MOVIE_DESCRIPTION_LENGTH} characters or fewer` }, { status: 400 })
  }
  if (!fileName) return NextResponse.json({ error: 'Choose a movie file' }, { status: 400 })
  if (!Number.isInteger(fileSize) || fileSize <= 0 || fileSize > MAX_MOVIE_BYTES) {
    return NextResponse.json({ error: 'Movie must be smaller than 1 GB' }, { status: 400 })
  }
  if (!mimeType) {
    return NextResponse.json({ error: 'Upload an MP4, MOV, M4V, or WEBM movie' }, { status: 400 })
  }

  const extension = movieExtensionForMimeType(mimeType)
  if (!extension) return NextResponse.json({ error: 'Unsupported movie format' }, { status: 400 })

  const movieId = randomUUID()
  const storagePath = `${session.user.id}/${movieId}/movie.${extension}`

  try {
    const supabase = await ensureMovieUploadBucket()
    const movie = await prisma.uploadedMovie.create({
      data: {
        id: movieId,
        userId: session.user.id,
        title,
        description: description || null,
        originalFileName: fileName.slice(0, 255),
        storagePath,
        mimeType,
        fileSize,
      },
      select: { id: true },
    })

    const { data, error } = await supabase.storage
      .from(MOVIE_UPLOAD_BUCKET)
      .createSignedUploadUrl(storagePath)

    if (error || !data) {
      await prisma.uploadedMovie.delete({ where: { id: movie.id } }).catch(() => {})
      throw error ?? new Error('Storage did not return an upload token')
    }

    return NextResponse.json({
      movieId: movie.id,
      path: data.path,
      token: data.token,
    }, { status: 201 })
  } catch (error) {
    if (storageUnavailable(error)) {
      return NextResponse.json({ error: 'Movie storage is not configured yet' }, { status: 503 })
    }
    console.error('[POST /api/movie-uploads]', error)
    return NextResponse.json({ error: 'Could not start the upload. Please try again.' }, { status: 500 })
  }
}

// Confirm the object reached storage before making it eligible for future feeds.
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await readJson<{ movieId?: unknown }>(request)
  const movieId = typeof body?.movieId === 'string' ? body.movieId : ''
  if (!movieId) return NextResponse.json({ error: 'Movie upload ID is required' }, { status: 400 })

  try {
    const movie = await prisma.uploadedMovie.findFirst({
      where: { id: movieId, userId: session.user.id },
    })
    if (!movie) return NextResponse.json({ error: 'Upload not found' }, { status: 404 })

    if (movie.status === 'ready') {
      return NextResponse.json({ movie: { id: movie.id, title: movie.title, status: movie.status } })
    }

    const supabase = await ensureMovieUploadBucket()
    const { data: fileInfo, error: infoError } = await supabase.storage
      .from(MOVIE_UPLOAD_BUCKET)
      .info(movie.storagePath)

    if (infoError || !fileInfo) {
      return NextResponse.json({ error: 'The movie has not finished uploading yet' }, { status: 409 })
    }

    if (Number(fileInfo.size) !== movie.fileSize) {
      return NextResponse.json({ error: 'The uploaded file size did not match' }, { status: 409 })
    }

    const readyMovie = await prisma.uploadedMovie.update({
      where: { id: movie.id },
      data: { status: 'ready', uploadedAt: new Date() },
      select: { id: true, title: true, status: true },
    })

    return NextResponse.json({ movie: readyMovie })
  } catch (error) {
    console.error('[PATCH /api/movie-uploads]', error)
    return NextResponse.json({ error: 'Could not finish the upload. Please try again.' }, { status: 500 })
  }
}

// Clean up an interrupted pending upload. Completed movies cannot be removed here.
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const movieId = new URL(request.url).searchParams.get('id')
  if (!movieId) return NextResponse.json({ error: 'Movie upload ID is required' }, { status: 400 })

  try {
    const movie = await prisma.uploadedMovie.findFirst({
      where: { id: movieId, userId: session.user.id, status: 'uploading' },
      select: { id: true, storagePath: true },
    })
    if (!movie) return NextResponse.json({ ok: true })

    const supabase = await ensureMovieUploadBucket()
    await supabase.storage.from(MOVIE_UPLOAD_BUCKET).remove([movie.storagePath])
    await prisma.uploadedMovie.delete({ where: { id: movie.id } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[DELETE /api/movie-uploads]', error)
    return NextResponse.json({ error: 'Could not clean up the upload' }, { status: 500 })
  }
}
