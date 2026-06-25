'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import { getCroppedImg } from '@/lib/image-crop-utils'

interface Props {
  currentAvatarUrl?: string | null
  onClose:   () => void
  onSuccess: (url: string) => void
}

type Stage = 'pick' | 'crop' | 'uploading' | 'error'

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
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
  const backdropRef   = useRef<HTMLDivElement>(null)

  // Escape to close (only when not uploading)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && stage !== 'uploading') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
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
      await fetch('/api/profile/avatar', { method: 'DELETE' })
      setUploadProgress(100)
      onSuccess('')
    } catch {
      setErrorMsg('Failed to remove avatar. Please try again.')
      setStage('error')
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div
      ref={backdropRef}
      onClick={e => {
        if (e.target === backdropRef.current && stage !== 'uploading') onClose()
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-md bg-ns-bg border border-ns-border rounded-2xl overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-ns-border">
          <h2 className="font-display text-xl tracking-wider text-ns-text">
            {stage === 'crop' ? 'CROP PHOTO' : 'PROFILE PICTURE'}
          </h2>
          {stage !== 'uploading' && (
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full text-ns-muted hover:text-ns-text hover:bg-ns-surface transition-colors"
              aria-label="Close"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          )}
        </div>

        {/* ── Stage: pick ───────────────────────────────────────────────── */}
        {stage === 'pick' && (
          <div className="p-6">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={onFileInput}
              className="sr-only"
              aria-label="Choose image file"
            />

            {/* Drop zone */}
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all
                ${dragOver
                  ? 'border-ns-gold bg-ns-gold/5'
                  : 'border-ns-border hover:border-ns-gold/50 hover:bg-ns-surface/40'
                }`}
            >
              {/* Upload icon */}
              <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                strokeWidth="1.5" className="text-ns-gold/40 mx-auto mb-4">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
              </svg>
              <p className="text-ns-text font-body font-medium text-sm mb-1">
                Drop a photo here
              </p>
              <p className="text-ns-muted font-body text-xs">
                or <span className="text-ns-gold underline-offset-2 hover:underline">browse files</span>
              </p>
              <p className="text-ns-muted/50 font-body text-[10px] mt-3">
                JPG, PNG, WEBP · Max 5 MB
              </p>
            </div>

            {/* Remove current avatar */}
            {currentAvatarUrl && (
              <button
                onClick={handleRemove}
                className="w-full mt-3 py-2.5 text-sm font-body text-red-400/70 hover:text-red-400 transition-colors"
              >
                Remove current photo
              </button>
            )}
          </div>
        )}

        {/* ── Stage: crop ───────────────────────────────────────────────── */}
        {stage === 'crop' && imageSrc && (
          <div>
            {/* Cropper area */}
            <div className="relative bg-black" style={{ height: 320 }}>
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
                  containerStyle: { background: '#07070F' },
                  cropAreaStyle:  { border: '2px solid #C8963E', boxShadow: '0 0 0 9999px rgba(7,7,15,0.75)' },
                }}
              />
            </div>

            {/* Zoom slider */}
            <div className="px-6 py-3 flex items-center gap-3 border-t border-ns-border bg-ns-surface/30">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
                className="text-ns-muted flex-shrink-0">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                <path d="M11 8v6M8 11h6"/>
              </svg>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={e => setZoom(Number(e.target.value))}
                className="flex-1 accent-ns-gold"
                aria-label="Zoom"
              />
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
                className="text-ns-muted flex-shrink-0">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                <path d="M11 8v6M8 11h6"/>
              </svg>
            </div>

            {/* Actions */}
            <div className="flex gap-2 px-5 py-4 border-t border-ns-border">
              <button
                onClick={() => { setStage('pick'); setImageSrc(null) }}
                className="flex-1 py-2.5 rounded-xl border border-ns-border text-ns-muted text-sm font-body hover:text-ns-text transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleUpload}
                className="flex-1 py-2.5 rounded-xl bg-ns-gold text-ns-bg text-sm font-body font-medium hover:bg-ns-gold/90 transition-colors"
              >
                Save Photo
              </button>
            </div>
          </div>
        )}

        {/* ── Stage: uploading ──────────────────────────────────────────── */}
        {stage === 'uploading' && (
          <div className="p-8 text-center">
            <div className="w-12 h-12 border-2 border-ns-gold/20 border-t-ns-gold rounded-full animate-spin mx-auto mb-4" />
            <p className="text-ns-text font-body text-sm mb-4">Saving your photo…</p>
            <div className="w-full bg-ns-border rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-ns-gold rounded-full transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* ── Stage: error ──────────────────────────────────────────────── */}
        {stage === 'error' && (
          <div className="p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v4m0 4h.01"/>
              </svg>
            </div>
            <p className="text-ns-text font-body font-medium text-sm mb-1">Upload failed</p>
            <p className="text-ns-muted font-body text-xs mb-5">{errorMsg}</p>
            <button
              onClick={() => { setStage('pick'); setImageSrc(null); setErrorMsg('') }}
              className="px-6 py-2.5 bg-ns-gold text-ns-bg rounded-xl text-sm font-body font-medium hover:bg-ns-gold/90 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
