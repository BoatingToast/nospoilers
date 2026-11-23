'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import { getCroppedImg } from '@/lib/image-crop-utils'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'

interface Props {
  currentAvatarUrl?: string | null
  onClose:   () => void
  onSuccess: (url: string) => void
}

type Stage = 'pick' | 'crop' | 'uploading' | 'error'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES      = 5 * 1024 * 1024

export default function AvatarUploadModal({ currentAvatarUrl, onClose, onSuccess }: Props) {
  const [stage,             setStage]             = useState<Stage>('pick')
  const [imageSrc,          setImageSrc]          = useState<string | null>(null)
  const [crop,              setCrop]              = useState({ x: 0, y: 0 })
  const [zoom,              setZoom]              = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [errorMsg,          setErrorMsg]          = useState('')
  const [dragOver,          setDragOver]          = useState(false)
  const [uploadProgress,    setUploadProgress]    = useState(0)

  const fileInputRef  = useRef<HTMLInputElement>(null)

  // Escape and backdrop close through Modal, except while uploading.
  const requestClose = useCallback(() => {
    if (stage !== 'uploading') onClose()
  }, [onClose, stage])

  // Revoke object URL on unmount
  useEffect(() => {
    return () => {
      if (imageSrc) URL.revokeObjectURL(imageSrc)
    }
  }, [imageSrc])

  // ── File validation + preview ────────────────────────────────────────────

  function handleFile(file: File) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      setErrorMsg('Only JPG, PNG, and WEBP images are allowed.')
      setStage('error')
      return
    }
    if (file.size > MAX_BYTES) {
      setErrorMsg('Image must be smaller than 5 MB.')
      setStage('error')
      return
    }
    const objectUrl = URL.createObjectURL(file)
    setImageSrc(objectUrl)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setStage('crop')
  }

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    // Reset so the same file can be re-selected
    e.target.value = ''
  }

  // ── Drag & drop ───────────────────────────────────────────────────────────

  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(true)
  }
  function onDragLeave() { setDragOver(false) }
  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  // ── Crop complete callback ────────────────────────────────────────────────

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels)
  }, [])

  // ── Upload ────────────────────────────────────────────────────────────────

  async function handleUpload() {
    if (!imageSrc || !croppedAreaPixels) return
    setStage('uploading')
    setUploadProgress(0)

    try {
      // Simulate progress during crop + network
      const progressTimer = setInterval(() => {
        setUploadProgress(p => Math.min(p + 12, 85))
      }, 120)

      // Crop image to 400×400 WebP
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels, 400)
      clearInterval(progressTimer)
      setUploadProgress(90)

      // Send to API
      const formData = new FormData()
      formData.append('file', blob, 'avatar.webp')

      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        body:   formData,
      })

      setUploadProgress(100)

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Upload failed')
      }

      const { url } = await res.json() as { url: string }
      onSuccess(url)
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed. Please try again.')
      setStage('error')
    }
  }

  // ── Remove avatar ─────────────────────────────────────────────────────────

  async function handleRemove() {
    setStage('uploading')
    setUploadProgress(50)
    try {
      const res = await fetch('/api/profile/avatar', { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => null) as { error?: string } | null
        throw new Error(data?.error ?? 'Failed to remove avatar')
      }
      setUploadProgress(100)
      onSuccess('')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to remove avatar. Please try again.')
      setStage('error')
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Modal
      onClose={requestClose}
      showClose={stage !== 'uploading'}
      ariaLabelledBy="avatar-modal-title"
    >
      <h2 id="avatar-modal-title" className="px-6 pb-4 pr-16 pt-6 font-heading text-2xl font-bold text-ns-text">
        {stage === 'crop' ? 'Crop photo' : 'Profile picture'}
      </h2>

      {/* Stage: pick */}
      {stage === 'pick' && (
        <div className="animate-fade-up px-6 pb-6">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onFileInput}
            className="sr-only"
            aria-label="Choose image file"
          />

          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors duration-150
              ${dragOver
                ? 'border-ns-secondary bg-ns-secondary/10'
                : 'border-ns-border-strong hover:bg-ns-surface-2'
              }`}
          >
            <svg aria-hidden="true" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor"
              strokeWidth="1.75" className="mx-auto mb-3 text-ns-muted">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
            </svg>
            <p className="text-base font-semibold text-ns-text">Drop a photo here</p>
            <p className="mt-1 text-sm text-ns-muted">
              or <span className="font-semibold text-ns-secondary-readable underline underline-offset-2">browse files</span>
            </p>
            <p className="mt-3 text-sm text-ns-subtle">JPG, PNG, WEBP · Max 5 MB</p>
          </div>

          {currentAvatarUrl && (
            <Button variant="danger" onClick={handleRemove} className="mt-3 w-full">
              Remove current photo
            </Button>
          )}
        </div>
      )}

      {/* Stage: crop */}
      {stage === 'crop' && imageSrc && (
        <div className="animate-fade-up">
          <div className="relative h-80 bg-ns-bg">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              style={{
                containerStyle: { background: 'rgb(var(--ns-bg))' },
                cropAreaStyle:  { border: '2px solid rgb(var(--ns-secondary))', boxShadow: '0 0 0 9999px rgb(var(--ns-bg) / 0.75)' },
              }}
            />
          </div>

          <div className="flex items-center gap-3 px-6 py-2">
            <svg aria-hidden="true" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
              className="flex-shrink-0 text-ns-muted">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              <path d="M8 11h6"/>
            </svg>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={e => setZoom(Number(e.target.value))}
              className="h-11 flex-1 cursor-pointer accent-ns-secondary"
              aria-label="Zoom"
            />
            <svg aria-hidden="true" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
              className="flex-shrink-0 text-ns-muted">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              <path d="M11 8v6M8 11h6"/>
            </svg>
          </div>

          <div className="flex gap-2 px-6 pb-6 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => { setStage('pick'); setImageSrc(null) }}>
              Back
            </Button>
            <Button className="flex-1" onClick={handleUpload}>
              Save photo
            </Button>
          </div>
        </div>
      )}

      {/* Stage: uploading */}
      {stage === 'uploading' && (
        <div className="animate-fade-up px-6 pb-8 pt-2" role="status">
          <p className="text-base text-ns-text">Saving your photo…</p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-ns-surface-3">
            <div
              className="h-full origin-left rounded-full bg-ns-secondary transition-transform duration-200 motion-reduce:transition-none"
              style={{ transform: `scaleX(${uploadProgress / 100})` }}
            />
          </div>
        </div>
      )}

      {/* Stage: error */}
      {stage === 'error' && (
        <div className="animate-fade-up px-6 pb-6 pt-2" role="alert">
          <p className="text-base font-semibold text-ns-danger">Upload failed</p>
          <p className="mt-1 text-sm text-ns-muted">{errorMsg}</p>
          <Button
            variant="outline"
            className="mt-5 w-full"
            onClick={() => { setStage('pick'); setImageSrc(null); setErrorMsg('') }}
          >
            Try again
          </Button>
        </div>
      )}
    </Modal>
  )
}
