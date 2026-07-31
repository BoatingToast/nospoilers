'use client'

import { useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react'
import Modal from '@/components/ui/Modal'
import WhereToWatch from '@/components/movie/WhereToWatch'
import {
  ArrowRightIcon,
  CheckIcon,
  CloseIcon,
  UploadMovieIcon,
  WarningIcon,
} from '@/components/icons'
import { getSupabasePublicClient } from '@/lib/supabase-client'
import {
  formatMovieFileSize,
  MAX_MOVIE_BYTES,
  MAX_MOVIE_DESCRIPTION_LENGTH,
  MAX_MOVIE_PROVIDER_NAME_LENGTH,
  MAX_MOVIE_TITLE_LENGTH,
  MAX_MOVIE_WATCH_PROVIDERS,
  MOVIE_WATCH_REGIONS,
  MOVIE_UPLOAD_BUCKET,
  normalizeMovieWatchProviders,
  normalizeMovieMimeType,
  type MovieWatchProvider,
} from '@/lib/movie-uploads'

type UploadStage = 'details' | 'uploading' | 'success'

interface UploadTicket {
  movieId: string
  path: string
  token: string
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
  const [stage, setStage] = useState<UploadStage>('details')
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
    const supabase = getSupabasePublicClient()
    if (!mimeType || !supabase) {
      setError('Movie storage is not configured yet.')
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

      const { error: uploadError } = await supabase.storage
        .from(MOVIE_UPLOAD_BUCKET)
        .uploadToSignedUrl(ticket.path, ticket.token, movieFile, {
          cacheControl: '3600',
          contentType: mimeType,
        })

      if (uploadError) throw new Error(uploadError.message)
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
      showClose={stage !== 'uploading'}
      maxWidth="max-w-2xl"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-movie-dialog-title"
        className="max-h-[calc(100vh-2rem)] overflow-y-auto"
        data-testid="upload-movie-dialog"
      >
        {stage === 'details' && (
          <form onSubmit={handleSubmit}>
            <div className="border-b border-ns-border px-5 py-5 pr-14 sm:px-7 sm:py-6 sm:pr-16">
              <p className="text-[10px] font-body uppercase tracking-[0.22em] text-ns-secondary">Creator upload</p>
              <h2 id="upload-movie-dialog-title" className="mt-1 font-display text-3xl tracking-wider text-ns-text">
                UPLOAD YOUR MOVIE
              </h2>
              <p className="mt-1 text-sm font-body text-ns-muted">
                Add your film now. It will be ready for the upcoming Reels experience.
              </p>
            </div>

            <div className="space-y-5 px-5 py-6 sm:px-7">
              <div
                onDragOver={event => { event.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`relative rounded-2xl border-2 border-dashed transition-colors ${
                  dragOver
                    ? 'border-ns-secondary bg-ns-secondary/10'
                    : movieFile
                      ? 'border-ns-success/45 bg-ns-success/5'
                      : 'border-ns-border bg-ns-surface/50 hover:border-ns-secondary/45'
                }`}
              >
                <input
                  ref={fileInputRef}
                  id="movie-file-upload"
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,video/x-m4v,.mp4,.webm,.mov,.m4v"
                  onChange={handleFileInput}
                  className="sr-only"
                  data-testid="movie-file-input"
                />

                {movieFile ? (
                  <div className="flex min-h-36 items-center gap-4 p-5 sm:p-6">
                    <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-ns-success/25 bg-ns-success/10 text-ns-success">
                      <CheckIcon size={22} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-heading text-sm font-semibold text-ns-text">{movieFile.name}</p>
                      <p className="mt-1 text-xs font-body text-ns-muted">
                        {formatMovieFileSize(movieFile.size)} · Ready to upload
                      </p>
                      <label
                        htmlFor="movie-file-upload"
                        className="mt-2 inline-block cursor-pointer text-xs font-body font-semibold text-ns-secondary hover:text-ns-secondary/80"
                      >
                        Choose a different file
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={removeMovie}
                      aria-label="Remove selected movie"
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-ns-muted transition-colors hover:bg-ns-surface-2 hover:text-ns-text"
                    >
                      <CloseIcon size={14} />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="movie-file-upload"
                    className="flex min-h-44 cursor-pointer flex-col items-center justify-center px-6 py-8 text-center"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-ns-secondary/25 bg-ns-secondary/10 text-ns-secondary">
                      <UploadMovieIcon size={23} />
                    </span>
                    <span className="mt-4 font-heading text-sm font-semibold text-ns-text">Drop your movie here</span>
                    <span className="mt-1 text-xs font-body text-ns-muted">
                      or <span className="font-semibold text-ns-secondary">browse your files</span>
                    </span>
                    <span className="mt-3 text-[10px] font-body uppercase tracking-wider text-ns-muted/70">
                      MP4, MOV, M4V, WEBM · Up to 1 GB
                    </span>
                  </label>
                )}
              </div>

              <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_9rem]">
                <div>
                  <label htmlFor="movie-title" className="text-sm font-body text-ns-muted">Movie title</label>
                  <input
                    id="movie-title"
                    value={title}
                    maxLength={MAX_MOVIE_TITLE_LENGTH}
                    onChange={event => setTitle(event.target.value)}
                    placeholder="Give your movie a title"
                    autoFocus
                    className="mt-1.5 w-full rounded-xl border border-ns-border bg-ns-surface px-4 py-3 text-sm font-body text-ns-text placeholder:text-ns-muted/50 transition-colors focus:border-ns-secondary/50 focus:outline-none focus:ring-2 focus:ring-ns-secondary/30"
                  />
                </div>
                <div>
                  <label htmlFor="movie-release-year" className="text-sm font-body text-ns-muted">
                    Release year <span className="text-ns-muted/55">(optional)</span>
                  </label>
                  <input
                    id="movie-release-year"
                    type="number"
                    inputMode="numeric"
                    min={1888}
                    max={new Date().getFullYear() + 5}
                    value={releaseYear}
                    onChange={event => setReleaseYear(event.target.value.slice(0, 4))}
                    placeholder="2026"
                    className="mt-1.5 w-full rounded-xl border border-ns-border bg-ns-surface px-4 py-3 text-sm font-body text-ns-text placeholder:text-ns-muted/50 transition-colors focus:border-ns-secondary/50 focus:outline-none focus:ring-2 focus:ring-ns-secondary/30"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="movie-description" className="text-sm font-body text-ns-muted">Short description <span className="text-ns-muted/55">(optional)</span></label>
                  <textarea
                    id="movie-description"
                    value={description}
                    maxLength={MAX_MOVIE_DESCRIPTION_LENGTH}
                    onChange={event => setDescription(event.target.value)}
                    placeholder="What should viewers know?"
                    rows={3}
                    className="mt-1.5 w-full resize-none rounded-xl border border-ns-border bg-ns-surface px-4 py-3 text-sm font-body text-ns-text placeholder:text-ns-muted/50 transition-colors focus:border-ns-secondary/50 focus:outline-none focus:ring-2 focus:ring-ns-secondary/30"
                  />
                </div>
              </div>

              <section aria-labelledby="movie-watch-providers-title" className="rounded-2xl border border-ns-border bg-ns-surface/35 p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 id="movie-watch-providers-title" className="text-sm font-heading font-semibold text-ns-text">
                      Automatic Where to Watch
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed font-body text-ns-muted">
                      NoSpoilers matches the title and optional release year, then adds every available service automatically.
                    </p>
                  </div>
                  <label className="flex flex-shrink-0 items-center gap-2 text-xs font-body text-ns-muted">
                    Region
                    <select
                      value={watchRegion}
                      onChange={event => setWatchRegion(event.target.value)}
                      className="rounded-lg border border-ns-border bg-ns-surface px-2.5 py-2 text-xs text-ns-text focus:border-ns-secondary/50 focus:outline-none"
                    >
                      {MOVIE_WATCH_REGIONS.map(region => (
                        <option key={region.code} value={region.code}>{region.label}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-ns-success/20 bg-ns-success/5 px-3.5 py-3">
                  <CheckIcon size={15} className="mt-0.5 flex-shrink-0 text-ns-success" />
                  <p className="text-xs leading-relaxed font-body text-ns-muted">
                    Nothing to select or confirm. If a confident catalog match exists, its streaming, rental, and purchase options are saved during upload.
                  </p>
                </div>

                <div className="mt-5 flex items-start justify-between gap-4 border-t border-ns-border/70 pt-4">
                  <div>
                    <p className="text-xs font-heading font-semibold text-ns-text">Manual links</p>
                    <p className="mt-0.5 text-[11px] font-body text-ns-muted">
                      Optional fallback for originals or direct platform URLs.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addWatchProvider}
                    disabled={watchProviders.length >= MAX_MOVIE_WATCH_PROVIDERS}
                    className="flex-shrink-0 rounded-lg border border-ns-secondary/35 px-3 py-1.5 text-xs font-body font-semibold text-ns-secondary transition-colors hover:bg-ns-secondary/10 disabled:pointer-events-none disabled:opacity-40"
                  >
                    + Add link
                  </button>
                </div>

                {watchProviders.length === 0 ? (
                  <button
                    type="button"
                    onClick={addWatchProvider}
                    className="mt-4 flex w-full items-center justify-center rounded-xl border border-dashed border-ns-border px-4 py-4 text-xs font-body text-ns-muted transition-colors hover:border-ns-secondary/40 hover:text-ns-secondary"
                  >
                    Add a direct link only if you want to override or supplement the automatic results
                  </button>
                ) : (
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
                      <div key={index} className="grid gap-2 rounded-xl border border-ns-border/70 bg-ns-bg/35 p-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.35fr)_2rem] sm:items-end">
                        <div>
                          <label htmlFor={`watch-provider-name-${index}`} className="text-[10px] font-body uppercase tracking-wider text-ns-muted">
                            Platform {index + 1}
                          </label>
                          <input
                            id={`watch-provider-name-${index}`}
                            list="movie-watch-platforms"
                            value={provider.name}
                            maxLength={MAX_MOVIE_PROVIDER_NAME_LENGTH}
                            onChange={event => updateWatchProvider(index, 'name', event.target.value)}
                            placeholder="Netflix"
                            className="mt-1 w-full rounded-lg border border-ns-border bg-ns-surface px-3 py-2.5 text-sm font-body text-ns-text placeholder:text-ns-muted/45 focus:border-ns-secondary/50 focus:outline-none focus:ring-2 focus:ring-ns-secondary/25"
                          />
                        </div>
                        <div>
                          <label htmlFor={`watch-provider-url-${index}`} className="text-[10px] font-body uppercase tracking-wider text-ns-muted">
                            Watch link
                          </label>
                          <input
                            id={`watch-provider-url-${index}`}
                            type="url"
                            inputMode="url"
                            value={provider.url}
                            onChange={event => updateWatchProvider(index, 'url', event.target.value)}
                            placeholder="https://..."
                            className="mt-1 w-full rounded-lg border border-ns-border bg-ns-surface px-3 py-2.5 text-sm font-body text-ns-text placeholder:text-ns-muted/45 focus:border-ns-secondary/50 focus:outline-none focus:ring-2 focus:ring-ns-secondary/25"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeWatchProvider(index)}
                          aria-label={`Remove ${provider.name || `platform ${index + 1}`}`}
                          className="flex h-8 w-8 items-center justify-center justify-self-end rounded-lg text-ns-muted transition-colors hover:bg-ns-danger/10 hover:text-ns-danger sm:justify-self-auto"
                        >
                          <CloseIcon size={13} />
                        </button>
                      </div>
                    ))}

                    <div className="pt-1">
                      <p className="text-[10px] font-body text-ns-muted/70">
                        {watchProviders.length}/{MAX_MOVIE_WATCH_PROVIDERS} manual links added
                      </p>
                    </div>
                  </div>
                )}
              </section>

              {error && (
                <div role="alert" className="flex items-start gap-2 rounded-xl border border-ns-danger/25 bg-ns-danger/10 px-4 py-3 text-xs font-body text-ns-danger">
                  <WarningIcon size={15} className="mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-ns-border bg-ns-surface/30 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-5 py-2.5 text-sm font-body text-ns-muted transition-colors hover:bg-ns-surface hover:text-ns-text"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!movieFile || !title.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-ns-secondary px-5 py-2.5 text-sm font-body font-semibold text-ns-secondary-foreground transition-all hover:bg-ns-secondary/90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
              >
                Upload movie
                <UploadMovieIcon size={16} />
              </button>
            </div>
          </form>
        )}

        {stage === 'uploading' && (
          <div className="px-6 py-12 text-center sm:px-12 sm:py-16">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-ns-secondary/25 bg-ns-secondary/10 text-ns-secondary">
              <UploadMovieIcon size={28} className="animate-pulse" />
            </span>
            <h2 id="upload-movie-dialog-title" className="mt-5 font-display text-3xl tracking-wider text-ns-text">UPLOADING &amp; MATCHING</h2>
            <p className="mt-2 truncate text-sm font-body text-ns-muted">{movieFile?.name}</p>
            <p className="mx-auto mt-2 max-w-sm text-xs font-body text-ns-muted/70">
              Checking regional watch options automatically while your movie uploads.
            </p>
            <div
              role="progressbar"
              aria-label="Movie upload progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              className="mx-auto mt-7 max-w-md"
            >
              <div className="h-2 overflow-hidden rounded-full bg-ns-border">
                <div
                  className="h-full rounded-full bg-ns-secondary transition-[width] duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[10px] font-body uppercase tracking-wider text-ns-muted">
                <span>Keep this window open</span>
                <span>{progress}%</span>
              </div>
            </div>
          </div>
        )}

        {stage === 'success' && (
          <div className="px-6 py-12 text-center sm:px-12 sm:py-14">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-ns-success/25 bg-ns-success/10 text-ns-success">
              <CheckIcon size={28} />
            </span>
            <p className="mt-5 text-[10px] font-body uppercase tracking-[0.22em] text-ns-success">Upload complete</p>
            <h2 id="upload-movie-dialog-title" className="mt-1 font-display text-3xl tracking-wider text-ns-text">YOUR MOVIE IS READY</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed font-body text-ns-muted">
              <span className="font-semibold text-ns-text">{title.trim()}</span> is safely uploaded. Tomorrow&apos;s Reels feature will give viewers a new way to discover it.
            </p>
            <p className={`mx-auto mt-3 w-fit rounded-full px-3 py-1 text-[10px] font-body font-semibold uppercase tracking-wider ${
              matchedTmdbId
                ? 'bg-ns-success/10 text-ns-success'
                : 'bg-ns-surface text-ns-muted'
            }`}>
              {matchedTmdbId
                ? 'Catalog matched automatically'
                : watchProviders.length > 0
                  ? 'Manual watch links saved'
                  : 'No catalog match · upload still ready'}
            </p>
            <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-ns-border px-5 py-2.5 text-sm font-body text-ns-text transition-colors hover:border-ns-secondary/45 hover:bg-ns-surface"
              >
                Upload another
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-ns-secondary px-6 py-2.5 text-sm font-body font-semibold text-ns-secondary-foreground transition-colors hover:bg-ns-secondary/90"
              >
                Done
              </button>
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
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
        data-testid="upload-movie-launcher"
        className="group relative w-full overflow-hidden rounded-3xl border border-ns-secondary/35 bg-gradient-to-br from-ns-secondary/20 via-ns-surface to-ns-surface p-5 text-left shadow-lg shadow-ns-secondary/5 transition-all duration-300 hover:-translate-y-0.5 hover:border-ns-secondary/60 hover:shadow-xl hover:shadow-ns-secondary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ns-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-ns-bg sm:p-7"
      >
        <span aria-hidden="true" className="absolute -right-16 -top-24 h-56 w-56 rounded-full bg-ns-secondary/15 blur-3xl transition-colors group-hover:bg-ns-secondary/20" />
        <span aria-hidden="true" className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-ns-secondary/60 to-transparent" />

        <span className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex min-w-0 items-start gap-4 sm:items-center sm:gap-5">
            <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border border-ns-secondary/30 bg-ns-secondary/15 text-ns-secondary transition-transform duration-300 group-hover:scale-105 sm:h-16 sm:w-16">
              <UploadMovieIcon size={28} />
            </span>
            <span className="min-w-0">
              <span className="text-[10px] font-body uppercase tracking-[0.24em] text-ns-secondary">
                Creator studio · New
              </span>
              <span id="upload-movie-section-title" className="mt-1 block font-display text-3xl tracking-wider text-ns-text sm:text-4xl">
                UPLOAD YOUR MOVIE
              </span>
              <span className="mt-1 block max-w-2xl text-xs leading-relaxed font-body text-ns-muted sm:text-sm">
                Share the film you made. Add your file and details in one simple upload flow.
              </span>
            </span>
          </span>

          <span className="flex flex-shrink-0 items-center justify-between gap-4 border-t border-ns-border/60 pt-4 sm:justify-end sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
            <span>
              <span className="block text-[10px] font-body uppercase tracking-wider text-ns-muted/70">
                {uploadedMovie ? 'Uploaded today' : 'Ready when you are'}
              </span>
              <span className="mt-1 block max-w-40 truncate text-xs font-body font-semibold text-ns-text">
                {uploadedMovie?.title ?? 'Choose a movie'}
              </span>
            </span>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ns-secondary text-ns-secondary-foreground transition-transform duration-300 group-hover:translate-x-1">
              <ArrowRightIcon size={17} />
            </span>
          </span>
        </span>
      </button>

      {uploadedMovie && uploadedMovie.watchProviders.length > 0 && (
        <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-ns-border bg-ns-surface/55 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-body uppercase tracking-[0.16em] text-ns-muted">
              Latest upload{uploadedMovie.tmdbId ? ' · Catalog matched automatically' : ''}
            </p>
            <p className="mt-0.5 truncate text-sm font-heading font-semibold text-ns-text">
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
