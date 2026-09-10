import { MAX_MEDIA_BYTES, MIN_CLIP, uid, type LabAsset, type AssetKind } from './model'

export function mediaEvent(element: HTMLMediaElement, event: string, timeout = 20000): Promise<void> {
  return new Promise((resolve, reject) => {
    const clear = () => { clearTimeout(timer); element.removeEventListener(event, ready); element.removeEventListener('error', error) }
    const ready = () => { clear(); resolve() }
    const error = () => { clear(); reject(new Error('This browser cannot decode this media. Try an H.264 MP4, WebM, MP3, or WAV file.')) }
    const timer = window.setTimeout(() => { clear(); reject(new Error('The media took too long to load. Try a smaller file or a different format.')) }, timeout)
    element.addEventListener(event, ready, { once: true })
    element.addEventListener('error', error, { once: true })
  })
}

export async function seekMedia(element: HTMLMediaElement, time: number) {
  if (Math.abs(element.currentTime - time) < 0.015 && element.readyState >= 2 && !element.seeking) return
  const ready = mediaEvent(element, 'seeked')
  element.currentTime = Math.max(0, time)
  await ready
}

export function releaseMedia(element: HTMLMediaElement) {
  element.pause()
  element.removeAttribute('src')
  element.load()
  element.remove()
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('This image could not be opened. Try a JPG, PNG, or WebP file.'))
    image.src = url
  })
}

export async function inspectMedia(file: File): Promise<LabAsset> {
  if (!file.size || file.size > MAX_MEDIA_BYTES) throw new Error(`${file.name}: choose a nonempty file smaller than 1 GB.`)
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  const kinds: Record<string, [AssetKind, string]> = {
    mp4: ['video', 'video/mp4'], m4v: ['video', 'video/mp4'], mov: ['video', 'video/quicktime'], webm: ['video', 'video/webm'],
    mp3: ['audio', 'audio/mpeg'], wav: ['audio', 'audio/wav'], m4a: ['audio', 'audio/mp4'], aac: ['audio', 'audio/aac'], ogg: ['audio', 'audio/ogg'], flac: ['audio', 'audio/flac'],
    jpg: ['image', 'image/jpeg'], jpeg: ['image', 'image/jpeg'], png: ['image', 'image/png'], webp: ['image', 'image/webp'],
  }
  const match = kinds[extension]
  if (!match) throw new Error(`${file.name}: use MP4, MOV, WebM, JPG, PNG, WebP, MP3, WAV, M4A, AAC, OGG, or FLAC.`)
  const [kind, mime] = match
  const asset: LabAsset = { id: uid(), name: file.name.slice(0, 500), kind, mime, size: file.size, duration: 0, width: 0, height: 0 }
  const url = URL.createObjectURL(file)
  let element: HTMLMediaElement | undefined
  try {
    let source: CanvasImageSource | undefined
    if (kind === 'image') {
      const image = await loadImage(url)
      asset.width = image.naturalWidth; asset.height = image.naturalHeight
      source = image
    } else {
      element = document.createElement(kind === 'video' ? 'video' : 'audio')
      element.preload = 'auto'; element.muted = true
      if (element instanceof HTMLVideoElement) element.playsInline = true
      const loaded = mediaEvent(element, 'loadeddata')
      element.src = url
      await loaded
      // Some recorded WebM files omit duration. Seeking to the end lets the demuxer find it.
      if (!Number.isFinite(element.duration)) await seekMedia(element, 1e10)
      asset.duration = element.duration
      if (!Number.isFinite(asset.duration) || asset.duration < MIN_CLIP || asset.duration > 86400) throw new Error(`${file.name}: the media needs a readable duration between 0.1 seconds and 24 hours.`)
      if (element instanceof HTMLVideoElement) {
        asset.width = element.videoWidth; asset.height = element.videoHeight
        await seekMedia(element, Math.min(0.25, asset.duration / 2))
        source = element
      }
    }
    if (source) {
      if (!asset.width || !asset.height || asset.width > 32768 || asset.height > 32768) throw new Error(`${file.name}: this image size is not supported.`)
      const canvas = document.createElement('canvas')
      canvas.width = 240; canvas.height = Math.max(1, Math.round(240 * asset.height / asset.width))
      if (canvas.height > 400) { canvas.width = Math.round(400 * asset.width / asset.height); canvas.height = 400 }
      canvas.getContext('2d')?.drawImage(source, 0, 0, canvas.width, canvas.height)
      asset.thumbnail = canvas.toDataURL('image/jpeg', 0.65)
    }
    return asset
  } finally {
    if (element) releaseMedia(element)
    URL.revokeObjectURL(url)
  }
}
