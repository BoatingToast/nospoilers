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
  isMovieWatchRegion,
  mergeMovieWatchProviders,
  movieExtensionForMimeType,
  normalizeMovieWatchProviders,
  normalizeMovieMimeType,
  type MovieWatchProvider,
} from '@/lib/movie-uploads'
import { ensureMovieUploadBucket } from '@/lib/supabase-storage'
import { findAutomaticMovieMatch, getMovieWatchProviders } from '@/services/tmdb'

export const runtime = 'nodejs'

interface StartUploadBody {
  title?: unknown
  description?: unknown
  releaseYear?: unknown
  fileName?: unknown
  fileSize?: unknown
  mimeType?: unknown
  watchProviders?: unknown
  watchRegion?: unknown
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
  const releaseYear = body.releaseYear === undefined || body.releaseYear === null || body.releaseYear === ''
    ? null
    : Number(body.releaseYear)
  const fileName = typeof body.fileName === 'string' ? body.fileName.trim() : ''
  const fileSize = typeof body.fileSize === 'number' ? body.fileSize : NaN
  const suppliedMimeType = typeof body.mimeType === 'string' ? body.mimeType : ''
  const mimeType = normalizeMovieMimeType(suppliedMimeType, fileName)
  const watchProviderResult = normalizeMovieWatchProviders(body.watchProviders)
  const watchRegion = typeof body.watchRegion === 'string' ? body.watchRegion.trim().toUpperCase() : 'US'

  if (!title) return NextResponse.json({ error: 'Add a title for your movie' }, { status: 400 })
  if (title.length > MAX_MOVIE_TITLE_LENGTH) {
    return NextResponse.json({ error: `Title must be ${MAX_MOVIE_TITLE_LENGTH} characters or fewer` }, { status: 400 })
  }
  if (description.length > MAX_MOVIE_DESCRIPTION_LENGTH) {
    return NextResponse.json({ error: `Description must be ${MAX_MOVIE_DESCRIPTION_LENGTH} characters or fewer` }, { status: 400 })
  }
  if (releaseYear !== null && (
    !Number.isInteger(releaseYear) || releaseYear < 1888 || releaseYear > new Date().getFullYear() + 5
  )) {
    return NextResponse.json({ error: 'Add a valid four-digit release year' }, { status: 400 })
  }
  if (!fileName) return NextResponse.json({ error: 'Choose a movie file' }, { status: 400 })
  if (!Number.isInteger(fileSize) || fileSize <= 0 || fileSize > MAX_MOVIE_BYTES) {
    return NextResponse.json({ error: 'Movie must be smaller than 1 GB' }, { status: 400 })
  }
  if (!mimeType) {
    return NextResponse.json({ error: 'Upload an MP4, MOV, M4V, or WEBM movie' }, { status: 400 })
  }
  if (watchProviderResult.error) {
    return NextResponse.json({ error: watchProviderResult.error }, { status: 400 })
  }
  if (!isMovieWatchRegion(watchRegion)) {
    return NextResponse.json({ error: 'Choose a valid two-letter watch region' }, { status: 400 })
  }

  const extension = movieExtensionForMimeType(mimeType)
  if (!extension) return NextResponse.json({ error: 'Unsupported movie format' }, { status: 400 })

  const movieId = randomUUID()
  const storagePath = `${session.user.id}/${movieId}/movie.${extension}`

  try {
    let tmdbId: number | null = null
    let automaticProviders: MovieWatchProvider[] = []

    try {
      const match = await findAutomaticMovieMatch(title, releaseYear)
      if (match) {
        tmdbId = match.id
        const availability = await getMovieWatchProviders(match.id, watchRegion)
        automaticProviders = availability?.providers ?? []
      }
    } catch (matchError) {
      // Availability should enhance an upload, never prevent an original film
      // from being shared when TMDB is unavailable or has no matching title.
      console.warn('[movie-uploads] automatic provider lookup skipped', matchError)
    }

    const watchProviders = mergeMovieWatchProviders(
      automaticProviders,
      watchProviderResult.providers,
    )
    const supabase = await ensureMovieUploadBucket()
    const movie = await prisma.uploadedMovie.create({
      data: {
        id: movieId,
        userId: session.user.id,
        title,
        description: description || null,
        releaseYear,
        tmdbId,
        originalFileName: fileName.slice(0, 255),
        storagePath,
        mimeType,
        fileSize,
        watchProviders: watchProviders.map(provider => ({
          name: provider.name,
          url: provider.url,
          source: provider.source ?? 'creator',
          providerId: provider.providerId ?? null,
          logoPath: provider.logoPath ?? null,
          accessTypes: provider.accessTypes ?? [],
        })),
        watchRegion,
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
      automaticMatch: tmdbId ? { tmdbId, providerCount: automaticProviders.length } : null,
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
      return NextResponse.json({
        movie: {
          id: movie.id,
          title: movie.title,
          status: movie.status,
          tmdbId: movie.tmdbId,
          watchProviders: movie.watchProviders,
          watchRegion: movie.watchRegion,
        },
      })
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
      select: {
        id: true,
        title: true,
        status: true,
        tmdbId: true,
        watchProviders: true,
        watchRegion: true,
      },
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
