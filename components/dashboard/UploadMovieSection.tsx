'use client'

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react'
import Modal from '@/components/ui/Modal'
import WhereToWatch from '@/components/movie/WhereToWatch'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  CheckIcon,
  CloseIcon,
  PlusIcon,
  UploadMovieIcon,
  WarningIcon,
} from '@/components/icons'
import {
  formatMovieFileSize,
  MAX_MOVIE_BYTES,
  MAX_MOVIE_DESCRIPTION_LENGTH,
  MAX_MOVIE_PROVIDER_NAME_LENGTH,
  MAX_MOVIE_TITLE_LENGTH,
  MAX_MOVIE_WATCH_PROVIDERS,
  MOVIE_WATCH_REGIONS,
  normalizeMovieWatchProviders,
  normalizeMovieMimeType,
  type MovieWatchProvider,
} from '@/lib/movie-uploads'

const UPLOAD_DETAILS = [
  'MP4, MOV, M4V, or WEBM up to 1 GB',
  'Add streaming links so viewers know where to watch',
  'Catalog matching keeps your film connected to the right title',
]

// Fills backwards only, so no transform lingers on the dialog content afterward.
const STAGE_ENTER = 'motion-safe:animate-[fadeUp_280ms_cubic-bezier(0.23,1,0.32,1)_backwards]'

type UploadStage = 'checking' | 'unavailable' | 'details' | 'uploading' | 'success'

interface UploadTicket {
  movieId: string
  signedUrl: string
}

interface UploadMovieDialogProps {
  onClose: () => void
  onUploaded: (movie: UploadedMovieSummary) => void
}

interface UploadedMovieSummary {
  title: string
  tmdbId: number | null
  watchProviders: MovieWatchProvider[]
  watchRegion: string
}

interface FinishedUploadResponse {
  movie: {
    tmdbId: number | null
    watchProviders: MovieWatchProvider[]
    watchRegion: string
  }
}

function movieFileError(file: File) {
  if (!normalizeMovieMimeType(file.type, file.name)) {
    return 'Choose an MP4, MOV, M4V, or WEBM movie.'
  }
  if (file.size <= 0) return 'That movie file is empty.'
  if (file.size > MAX_MOVIE_BYTES) return 'Choose a movie smaller than 1 GB.'
  return null
}

function titleFromFileName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim().slice(0, MAX_MOVIE_TITLE_LENGTH)
}

async function responseError(response: Response, fallback: string) {
  try {
    const body = await response.json() as { error?: string }
    return body.error ?? fallback
  } catch {
    return fallback
  }
}

function UploadMovieDialog({ onClose, onUploaded }: UploadMovieDialogProps) {
  const [stage, setStage] = useState<UploadStage>('checking')
  const [availabilityAttempt, setAvailabilityAttempt] = useState(0)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [releaseYear, setReleaseYear] = useState('')
  const [watchProviders, setWatchProviders] = useState<MovieWatchProvider[]>([])
  const [watchRegion, setWatchRegion] = useState('US')
  const [matchedTmdbId, setMatchedTmdbId] = useState<number | null>(null)
  const [movieFile, setMovieFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    async function checkAvailability() {
      try {
        const response = await fetch('/api/movie-uploads', { cache: 'no-store', signal: controller.signal })
        if (!response.ok) throw new Error(await responseError(response, 'Movie uploads are temporarily unavailable. Please try again later.'))
        if (!controller.signal.aborted) setStage('details')
      } catch (cause) {
        if (controller.signal.aborted) return
        setError(cause instanceof Error ? cause.message : 'Could not check upload availability. Please try again.')
        setStage('unavailable')
      }
    }
    void checkAvailability()
    return () => controller.abort()
  }, [availabilityAttempt])

  function chooseMovie(file: File) {
    const nextError = movieFileError(file)
    if (nextError) {
      setMovieFile(null)
      setError(nextError)
      return
    }

    setMovieFile(file)
    setError('')
    if (!title.trim()) setTitle(titleFromFileName(file.name))
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) chooseMovie(file)
    // Let creators choose the same file again after correcting another field.
    event.target.value = ''
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragOver(false)
    const file = event.dataTransfer.files?.[0]
    if (file) chooseMovie(file)
  }

  function removeMovie() {
    setMovieFile(null)
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function addWatchProvider() {
    if (watchProviders.length >= MAX_MOVIE_WATCH_PROVIDERS) return
    setWatchProviders(current => [...current, { name: '', url: '' }])
  }

  function updateWatchProvider(index: number, field: keyof MovieWatchProvider, value: string) {
    setWatchProviders(current => current.map((provider, providerIndex) => (
      providerIndex === index ? { ...provider, [field]: value } : provider
    )))
    setError('')
  }

  function removeWatchProvider(index: number) {
    setWatchProviders(current => current.filter((_, providerIndex) => providerIndex !== index))
    setError('')
  }

  function resetForm() {
    setStage('details')
    setTitle('')
    setDescription('')
    setReleaseYear('')
    setWatchProviders([])
    setWatchRegion('US')
    setMatchedTmdbId(null)
    setMovieFile(null)
    setError('')
    setProgress(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedTitle = title.trim()

    if (!movieFile) {
      setError('Choose your movie file first.')
      return
    }
    if (!trimmedTitle) {
      setError('Add a title for your movie.')
      return
    }

    const watchProviderResult = normalizeMovieWatchProviders(watchProviders)
    if (watchProviderResult.error) {
      setError(watchProviderResult.error)
      return
    }

    const mimeType = normalizeMovieMimeType(movieFile.type, movieFile.name)
    if (!mimeType) {
      setError('Choose an MP4, MOV, M4V, or WEBM movie.')
      return
    }

    setError('')
    setStage('uploading')
    setProgress(8)

    let movieId: string | null = null
    const progressTimer = window.setInterval(() => {
      setProgress(current => Math.min(current + (current < 45 ? 6 : 2), 88))
    }, 500)

    try {
      const startResponse = await fetch('/api/movie-uploads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: trimmedTitle,
          description: description.trim(),
          releaseYear: releaseYear ? Number(releaseYear) : null,
          fileName: movieFile.name,
          fileSize: movieFile.size,
          mimeType,
          watchProviders: watchProviderResult.providers,
          watchRegion,
        }),
      })

      if (!startResponse.ok) {
        throw new Error(await responseError(startResponse, 'Could not start the upload.'))
      }

      const ticket = await startResponse.json() as UploadTicket
      movieId = ticket.movieId
      setProgress(current => Math.max(current, 18))

      // The server-issued URL authorizes this one file. No browser Supabase
      // client, public API key, or application cookie is needed by storage.
      const uploadResponse = await fetch(ticket.signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': mimeType, 'Cache-Control': 'max-age=3600' },
        body: movieFile,
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
      })

      if (!uploadResponse.ok) throw new Error('Could not upload your movie. Please try again.')
      setProgress(92)

      const finishResponse = await fetch('/api/movie-uploads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movieId }),
      })

      if (!finishResponse.ok) {
        throw new Error(await responseError(finishResponse, 'Could not finish the upload.'))
      }
      const finished = await finishResponse.json() as FinishedUploadResponse
      const storedProviders = Array.isArray(finished.movie.watchProviders)
        ? finished.movie.watchProviders
        : watchProviderResult.providers

      window.clearInterval(progressTimer)
      setProgress(100)
      setStage('success')
      setMatchedTmdbId(finished.movie.tmdbId)
      onUploaded({
        title: trimmedTitle,
        tmdbId: finished.movie.tmdbId,
        watchProviders: storedProviders,
        watchRegion: finished.movie.watchRegion,
      })
    } catch (uploadError) {
      window.clearInterval(progressTimer)
      if (movieId) {
        await fetch(`/api/movie-uploads?id=${encodeURIComponent(movieId)}`, { method: 'DELETE' }).catch(() => {})
      }
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed. Please try again.')
      setStage('details')
      setProgress(0)
    }
  }










  return (
    <Modal
      onClose={stage === 'uploading' ? () => {} : onClose}
      ariaLabelledBy="upload-movie-dialog-title"
      showClose={stage !== 'uploading'}
      maxWidth="max-w-2xl"
    >
      <div
        key={stage === 'checking' || stage === 'unavailable' ? 'status' : stage}
        className={STAGE_ENTER}
        data-testid="upload-movie-dialog"
      >
        {(stage === 'checking' || stage === 'unavailable') && (
          <div className="px-6 py-14 sm:px-12">
            <h2 id="upload-movie-dialog-title" className="pr-10 font-display text-3xl text-ns-text">
              {stage === 'checking' ? 'Checking movie uploads…' : 'Uploads are unavailable right now'}
            </h2>
            {stage === 'checking' ? (
              <>
                <p role="status" className="mt-3 text-base text-ns-muted">Checking that we can receive your movie.</p>
                <Skeleton className="mt-6 h-2 w-full rounded-full bg-ns-surface-2" />
              </>
            ) : (
              <>
                <p role="alert" className="mt-3 text-base leading-relaxed text-ns-muted">{error}</p>
                <Button
                  className="mt-6"
                  onClick={() => { setError(''); setStage('checking'); setAvailabilityAttempt(attempt => attempt + 1) }}
                >
                  Try again
                </Button>
              </>
            )}
          </div>
        )}
        {stage === 'details' && (
          <form onSubmit={handleSubmit}>
            <div className="px-6 pb-2 pr-16 pt-7 sm:px-8 sm:pr-16">
              <h2 id="upload-movie-dialog-title" className="font-display text-3xl text-ns-text sm:text-4xl">
                Upload your movie
              </h2>
              <p className="mt-2 text-base leading-relaxed text-ns-muted">
                Add your film now. It will be ready for the upcoming Reels experience.
              </p>
            </div>

            <div className="space-y-6 px-6 py-6 sm:px-8">
              <div
                onDragOver={event => { event.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`relative rounded-2xl border-2 border-dashed transition-colors duration-200 ${
                  dragOver
                    ? 'border-ns-secondary bg-ns-tile-rose'
                    : movieFile
                      ? 'border-transparent bg-ns-success/10'
                      : 'border-ns-border-strong bg-ns-bg hover:bg-ns-surface-2'
                }`}
              >
                <input
                  ref={fileInputRef}
                  id="movie-file-upload"
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,video/x-m4v,.mp4,.webm,.mov,.m4v"
                  onChange={handleFileInput}
                  className="peer sr-only"
                  data-testid="movie-file-input"
                />

                {movieFile ? (
                  <div className="flex min-h-32 items-center gap-4 p-5 motion-safe:animate-fade-up sm:p-6">
                    <CheckIcon size={24} className="flex-shrink-0 text-ns-success" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-heading text-base font-semibold text-ns-text">{movieFile.name}</p>
                      <p className="mt-0.5 text-sm tabular-nums text-ns-muted">
                        {formatMovieFileSize(movieFile.size)} · Ready to upload
                      </p>
                      <label
                        htmlFor="movie-file-upload"
                        className="mt-1 inline-flex min-h-10 cursor-pointer items-center text-sm font-semibold text-ns-text underline underline-offset-4 transition-colors hover:text-ns-secondary-readable"
                      >
                        Choose a different file
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={removeMovie}
                      aria-label="Remove selected movie"
                      className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-ns-muted transition-colors hover:bg-ns-surface-2 hover:text-ns-text"
                    >
                      <CloseIcon size={16} />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="movie-file-upload"
                    className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl px-6 py-8 text-center peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ns-text"
                  >
                    <UploadMovieIcon size={26} className={`text-ns-text transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${dragOver ? '-translate-y-1' : ''}`} />
                    <span className="mt-3 font-heading text-lg font-bold text-ns-text">Drop your movie here</span>
                    <span className="mt-0.5 text-base text-ns-muted">
                      or <span className="font-semibold text-ns-text underline underline-offset-4">browse your files</span>
                    </span>
                    <span className="mt-3 text-sm text-ns-muted">
                      MP4, MOV, M4V, WEBM · Up to 1 GB
                    </span>
                  </label>
                )}
              </div>

              <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_11rem] sm:items-start">
                <Input
                  id="movie-title"
                  label="Movie title"
                  value={title}
                  maxLength={MAX_MOVIE_TITLE_LENGTH}
                  onChange={event => setTitle(event.target.value)}
                  placeholder="Give your movie a title"
                  autoFocus
                />
                <Input
                  id="movie-release-year"
                  label="Release year (optional)"
                  type="number"
                  inputMode="numeric"
                  min={1888}
                  max={new Date().getFullYear() + 5}
                  value={releaseYear}
                  onChange={event => setReleaseYear(event.target.value.slice(0, 4))}
                  placeholder="2026"
                />
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label htmlFor="movie-description" className="text-sm font-semibold text-ns-text">Short description (optional)</label>
                  <textarea
                    id="movie-description"
                    value={description}
                    maxLength={MAX_MOVIE_DESCRIPTION_LENGTH}
                    onChange={event => setDescription(event.target.value)}
                    placeholder="What should viewers know?"
                    rows={3}
                    className="w-full resize-none rounded-xl border border-ns-border-strong bg-ns-bg px-4 py-3 text-base text-ns-text transition-colors duration-150 placeholder:text-ns-subtle focus:border-ns-text focus:outline-none focus:ring-1 focus:ring-ns-text"
                  />
                </div>
              </div>

              <section aria-labelledby="movie-watch-providers-title" className="rounded-2xl bg-ns-surface-2 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 id="movie-watch-providers-title" className="font-heading text-lg font-bold text-ns-text">
                      Automatic Where to Watch
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-ns-muted">
                      NoSpoilers matches the title and optional release year, then adds every available service automatically.
                    </p>
                  </div>
                  <label className="flex flex-shrink-0 items-center gap-2 text-sm font-semibold text-ns-text">
                    Region
                    <select
                      value={watchRegion}
                      onChange={event => setWatchRegion(event.target.value)}
                      className="min-h-11 rounded-xl border border-ns-border-strong bg-ns-bg px-3 text-sm font-normal text-ns-text focus:border-ns-text focus:outline-none"
                    >
                      {MOVIE_WATCH_REGIONS.map(region => (
                        <option key={region.code} value={region.code}>{region.label}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <p className="mt-4 flex items-start gap-2.5 text-sm leading-relaxed text-ns-muted">
                  <CheckIcon size={16} className="mt-0.5 flex-shrink-0 text-ns-success" />
                  Nothing to select or confirm. If a confident catalog match exists, its streaming, rental, and purchase options are saved during upload.
                </p>

                <div className="mt-5 flex items-center justify-between gap-4 border-t border-ns-border pt-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ns-text">Manual links</p>
                    <p className="mt-0.5 text-sm text-ns-muted">
                      Optional fallback for originals or direct platform URLs.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addWatchProvider}
                    disabled={watchProviders.length >= MAX_MOVIE_WATCH_PROVIDERS}
                    className="flex-shrink-0 hover:bg-ns-surface-3"
                  >
                    <PlusIcon size={14} /> Add link
                  </Button>
                </div>

                {watchProviders.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <datalist id="movie-watch-platforms">
                      <option value="Netflix" />
                      <option value="Hulu" />
                      <option value="HBO Max" />
                      <option value="Disney+" />
                      <option value="Prime Video" />
                      <option value="Apple TV+" />
                      <option value="YouTube" />
                    </datalist>

                    {watchProviders.map((provider, index) => (
                      <div key={index} className="grid gap-3 rounded-xl bg-ns-surface-3 p-3 motion-safe:animate-fade-up sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.35fr)_2.75rem] sm:items-end">
                        <Input
                          id={`watch-provider-name-${index}`}
                          label={`Platform ${index + 1}`}
                          list="movie-watch-platforms"
                          value={provider.name}
                          maxLength={MAX_MOVIE_PROVIDER_NAME_LENGTH}
                          onChange={event => updateWatchProvider(index, 'name', event.target.value)}
                          placeholder="Netflix"
                        />
                        <Input
                          id={`watch-provider-url-${index}`}
                          label="Watch link"
                          type="url"
                          inputMode="url"
                          value={provider.url}
                          onChange={event => updateWatchProvider(index, 'url', event.target.value)}
                          placeholder="https://..."
                        />
                        <button
                          type="button"
                          onClick={() => removeWatchProvider(index)}
                          aria-label={`Remove ${provider.name || `platform ${index + 1}`}`}
                          className="flex h-11 w-11 items-center justify-center justify-self-end rounded-full text-ns-muted transition-colors hover:bg-ns-danger/10 hover:text-ns-danger sm:mb-0.5 sm:justify-self-auto"
                        >
                          <CloseIcon size={15} />
                        </button>
                      </div>
                    ))}

                    <p className="text-sm tabular-nums text-ns-muted">
                      {watchProviders.length}/{MAX_MOVIE_WATCH_PROVIDERS} manual links added
                    </p>
                  </div>
                )}
              </section>

              {error && (
                <div role="alert" className="flex items-start gap-2.5 rounded-xl bg-ns-danger/10 px-4 py-3 text-sm leading-relaxed text-ns-danger motion-safe:animate-fade-up">
                  <WarningIcon size={16} className="mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 z-10 flex flex-col-reverse gap-2 border-t border-ns-border bg-ns-surface px-6 py-4 sm:flex-row sm:justify-end sm:px-8">
              <Button variant="ghost" onClick={onClose} className="hover:bg-ns-surface-2">
                Cancel
              </Button>
              <Button type="submit" disabled={!movieFile || !title.trim()}>
                Upload movie
                <UploadMovieIcon size={16} />
              </Button>
            </div>
          </form>
        )}

        {stage === 'uploading' && (
          <div className="px-6 py-14 sm:px-12 sm:py-16">
            <h2 id="upload-movie-dialog-title" className="font-display text-3xl text-ns-text sm:text-4xl">Uploading &amp; matching</h2>
            <p className="mt-3 truncate text-base font-semibold text-ns-text">{movieFile?.name}</p>
            <p className="mt-1 text-base leading-relaxed text-ns-muted">
              Checking regional watch options automatically while your movie uploads.
            </p>
            <div
              role="progressbar"
              aria-label="Movie upload progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              className="mt-8"
            >
              <div className="h-2.5 overflow-hidden rounded-full bg-ns-surface-3">
                <div
                  className="h-full origin-left rounded-full bg-ns-secondary transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none"
                  style={{ transform: `scaleX(${progress / 100})` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-sm text-ns-muted">
                <span>Keep this window open</span>
                <span className="font-semibold tabular-nums text-ns-text">{progress}%</span>
              </div>
            </div>
          </div>
        )}

        {stage === 'success' && (
          <div className="px-6 py-14 sm:px-12">
            <p className="flex items-center gap-2 text-sm font-semibold text-ns-success">
              <CheckIcon size={16} /> Upload complete
            </p>
            <h2 id="upload-movie-dialog-title" className="mt-2 pr-10 font-display text-3xl text-ns-text sm:text-4xl">Your movie is ready</h2>
            <p className="mt-3 text-base leading-relaxed text-ns-muted [overflow-wrap:anywhere]">
              <span className="font-semibold text-ns-text">{title.trim()}</span> is safely uploaded. Tomorrow&apos;s Reels feature will give viewers a new way to discover it.
            </p>
            <Badge variant={matchedTmdbId ? 'success' : 'muted'} size="md" className="mt-4 whitespace-normal">
              {matchedTmdbId
                ? 'Catalog matched automatically'
                : watchProviders.length > 0
                  ? 'Manual watch links saved'
                  : 'No catalog match · upload still ready'}
            </Badge>
            <div className="mt-8 flex flex-col gap-2 sm:flex-row">
              <Button onClick={onClose}>Done</Button>
              <Button variant="secondary" onClick={resetForm} className="bg-ns-surface-2 hover:bg-ns-surface-3">
                Upload another
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default function UploadMovieSection() {
  const [isOpen, setIsOpen] = useState(false)
  const [uploadedMovie, setUploadedMovie] = useState<UploadedMovieSummary | null>(null)

  return (
    <section aria-labelledby="upload-movie-section-title">
      <div className="rounded-3xl bg-ns-tile-peach p-7 sm:p-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 id="upload-movie-section-title" className="font-display text-3xl text-ns-text sm:text-4xl">
              Upload your movie
            </h2>
            <p className="mt-2 max-w-xl text-base leading-relaxed text-ns-muted">
              Share the film you made. Add your file and details in one simple upload flow.
            </p>
          </div>
          <Button
            size="lg"
            onClick={() => setIsOpen(true)}
            aria-haspopup="dialog"
            data-testid="upload-movie-launcher"
            className="flex-shrink-0"
          >
            <UploadMovieIcon size={18} />
            Choose a movie
          </Button>
        </div>

        {uploadedMovie && (
          <p className="mt-4 truncate text-sm text-ns-muted motion-safe:animate-fade-up">
            Uploaded today: <span className="font-semibold text-ns-text">{uploadedMovie.title}</span>
          </p>
        )}

        <div className="mt-7 border-t border-ns-border pt-5">
          <h3 className="font-heading text-base font-semibold text-ns-text">Before you upload</h3>
          <ul className="mt-3 grid gap-2.5 md:grid-cols-3 md:gap-5">
            {UPLOAD_DETAILS.map(detail => (
              <li key={detail} className="flex items-start gap-2 text-sm leading-relaxed text-ns-muted">
                <CheckIcon size={15} className="mt-0.5 flex-shrink-0 text-ns-text" />
                {detail}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {uploadedMovie && uploadedMovie.watchProviders.length > 0 && (
        <div className="mt-3 flex flex-col gap-3 rounded-2xl bg-ns-surface p-5 motion-safe:animate-fade-up sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-ns-muted">
              Latest upload{uploadedMovie.tmdbId ? ' · Catalog matched automatically' : ''}
            </p>
            <p className="mt-0.5 truncate font-heading text-base font-semibold text-ns-text">
              {uploadedMovie.title} · {uploadedMovie.watchProviders.length} {uploadedMovie.watchProviders.length === 1 ? 'service' : 'services'}
            </p>
          </div>
          <WhereToWatch
            movieTitle={uploadedMovie.title}
            providers={uploadedMovie.watchProviders}
            region={uploadedMovie.watchRegion}
          />
        </div>
      )}

      {isOpen && (
        <UploadMovieDialog
          onClose={() => setIsOpen(false)}
          onUploaded={setUploadedMovie}
        />
      )}
    </section>
  )
}
