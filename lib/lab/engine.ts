import { clamp, clipAt, clipDuration, dimensions, fadeAt, projectDuration, type LabProject, type LabTitle, type Look } from './model'
import { loadImage, mediaEvent, releaseMedia, seekMedia } from './media'
import { finalizeWebm } from './webm'

export const LOOKS: { id: Look; label: string; filter: string }[] = [
  { id: 'original', label: 'Original', filter: 'none' },
  { id: 'cinema', label: 'Cinema', filter: 'contrast(1.15) saturate(0.8)' },
  { id: 'warm', label: 'Golden', filter: 'sepia(0.25) saturate(1.15)' },
  { id: 'mono', label: 'Noir', filter: 'grayscale(1) contrast(1.15)' },
  { id: 'faded', label: 'Faded', filter: 'contrast(0.85) saturate(0.7) brightness(1.1)' },
]

interface Slot { key: string; element: HTMLMediaElement; time: number; speed: number; volume: number }
interface Callbacks { onTime?: (time: number) => void; onEnded?: () => void; onError?: (message: string) => void; onBuffering?: (buffering: boolean) => void }

function drawTitle(ctx: CanvasRenderingContext2D, title: LabTitle, width: number, height: number) {
  const fontSize = title.size * height / 720
  ctx.save()
  ctx.font = `600 ${fontSize}px sans-serif`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  const lines: string[] = []
  const maxWidth = width * 0.84
  for (const paragraph of title.text.split('\n')) {
    let line = ''
    // Wrap long words too, keeping text inside the export's safe area.
    for (const character of paragraph) {
      if (ctx.measureText(line + character).width > maxWidth && line) { lines.push(line.trim()); line = '' }
      line += character
    }
    lines.push(line.trim())
  }
  const lineHeight = fontSize * 1.25
  const visible = lines.slice(0, Math.max(1, Math.floor(height * 0.8 / lineHeight)))
  const blockHeight = visible.length * lineHeight
  const center = title.position === 'top' ? height * 0.1 + blockHeight / 2 : title.position === 'bottom' ? height * 0.9 - blockHeight / 2 : height / 2
  if (title.backdrop) {
    const measured = Math.max(...visible.map(line => ctx.measureText(line).width), fontSize)
    ctx.fillStyle = 'rgba(0,0,0,0.65)'
    ctx.fillRect((width - measured) / 2 - fontSize * 0.45, center - blockHeight / 2 - fontSize * 0.2, measured + fontSize * 0.9, blockHeight + fontSize * 0.4)
  }
  ctx.fillStyle = title.color
  ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = fontSize * 0.15; ctx.shadowOffsetY = 2
  visible.forEach((line, i) => ctx.fillText(line, width / 2, center + (i - (visible.length - 1) / 2) * lineHeight, maxWidth))
  ctx.restore()
}

/** One compositor for preview and export. Media stays in local blob URLs. */
export class LabEngine {
  private canvas: HTMLCanvasElement
  private callbacks: Callbacks
  private project: LabProject | null = null
  private media = new Map<string, HTMLMediaElement>()
  private images = new Map<string, HTMLImageElement>()
  private loading = new Map<string, Promise<void>>()
  private audioContext: AudioContext | null = null
  private destination: MediaStreamAudioDestinationNode | null = null
  private gains = new Map<string, GainNode>()
  private host: HTMLDivElement
  private raf = 0
  private generation = 0
  private disposed = false
  private playing = false
  private current = 0
  private baseTime = 0
  private baseWall = 0
  private activeKey = ''
  private recorder: MediaRecorder | null = null

  constructor(canvas: HTMLCanvasElement, callbacks: Callbacks = {}) {
    this.canvas = canvas; this.callbacks = callbacks
    this.host = document.createElement('div')
    this.host.setAttribute('aria-hidden', 'true')
    this.host.style.cssText = 'position:fixed;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;bottom:0;left:0'
    document.body.appendChild(this.host)
  }

  async update(project: LabProject, urls: Map<string, string>) {
    this.pause()
    const generation = ++this.generation
    this.project = project
    const required = new Set<string>()
    const work: Promise<void>[] = []
    const ensure = (key: string, assetId: string, kind: 'video' | 'audio' | 'image') => {
      required.add(key)
      if (this.loading.has(key)) { work.push(this.loading.get(key)!); return }
      if (this.media.has(key) || this.images.has(key)) return
      const url = urls.get(assetId)
      if (!url) { work.push(Promise.reject(new Error('An original media file is missing. Restore a project backup or remove that clip.'))); return }
      const promise = (async () => {
        if (kind === 'image') { const image = await loadImage(url); if (!this.disposed) this.images.set(key, image) }
        else {
          const element = document.createElement(kind)
          element.preload = 'auto'
          if (element instanceof HTMLVideoElement) element.playsInline = true
          element.muted = true
          const loaded = mediaEvent(element, 'loadeddata')
          this.media.set(key, element)
          this.host.appendChild(element)
          element.src = url
          await loaded
        }
      })()
      this.loading.set(key, promise)
      work.push(promise)
    }
    for (const clip of project.clips) {
      const asset = project.assets.find(a => a.id === clip.assetId)
      if (asset && asset.kind !== 'audio') ensure(`visual:${asset.id}`, asset.id, asset.kind)
    }
    for (const audio of project.audio) ensure(`audio:${audio.id}`, audio.assetId, 'audio')
    try {
      await Promise.all(work)
      if (this.disposed || generation !== this.generation) return
      for (const [key, element] of this.media) {
        if (!required.has(key)) { releaseMedia(element); this.media.delete(key); this.loading.delete(key); this.gains.get(key)?.disconnect(); this.gains.delete(key) }
      }
      for (const key of this.images.keys()) if (!required.has(key)) { this.images.delete(key); this.loading.delete(key) }
      await this.seek(Math.min(this.current, projectDuration(project)))
    } catch (error) {
      if (!this.disposed && generation === this.generation) throw error
    }
  }

  async enableAudio(monitor = true) {
    if (!this.audioContext) {
      this.audioContext = new AudioContext()
      this.destination = this.audioContext.createMediaStreamDestination()
    }
    for (const [key, element] of this.media) {
      if (this.gains.has(key)) continue
      const source = this.audioContext.createMediaElementSource(element)
      const gain = this.audioContext.createGain()
      gain.gain.value = 0
      source.connect(gain); gain.connect(this.destination!)
      if (monitor) gain.connect(this.audioContext.destination)
      element.muted = false
      this.gains.set(key, gain)
    }
    if (this.audioContext.state === 'suspended') await this.audioContext.resume()
  }

  private slots(time: number): Slot[] {
    const project = this.project
    if (!project) return []
    const result: Slot[] = []
    const active = clipAt(project, time)
    if (active?.clip.assetId) {
      const key = `visual:${active.clip.assetId}`
      const element = this.media.get(key)
      if (element) result.push({ key, element, time: active.clip.in + (time - active.start) * active.clip.speed, speed: active.clip.speed, volume: active.clip.volume * fadeAt(time - active.start, clipDuration(active.clip), active.clip.fadeIn, active.clip.fadeOut) })
    }
    for (const audio of project.audio) {
      const duration = audio.out - audio.in
      if (time < audio.start || time >= audio.start + duration) continue
      const key = `audio:${audio.id}`
      const element = this.media.get(key)
      if (element) result.push({ key, element, time: audio.in + time - audio.start, speed: 1, volume: audio.volume * fadeAt(time - audio.start, duration, audio.fadeIn, audio.fadeOut) })
    }
    return result
  }

  private keyAt(time: number, slots: Slot[]) { return `${clipAt(this.project!, time)?.clip.id ?? 'empty'}|${slots.map(slot => slot.key).join(',')}` }

  private pauseMedia() {
    for (const element of this.media.values()) element.pause()
    for (const gain of this.gains.values()) gain.gain.value = 0
  }

  private setVolumes(slots: Slot[]) {
    const keys = new Set(slots.map(slot => slot.key))
    for (const [key, element] of this.media) if (!keys.has(key)) { element.pause(); const gain = this.gains.get(key); if (gain) gain.gain.value = 0 }
    for (const slot of slots) { const gain = this.gains.get(slot.key); if (gain) gain.gain.value = slot.volume }
  }

  async seek(time: number) {
    this.pause()
    const generation = ++this.generation
    const next = clamp(time, 0, this.project ? projectDuration(this.project) : 0)
    this.current = next
    const slots = this.slots(next)
    await Promise.all(slots.map(slot => seekMedia(slot.element, slot.time)))
    if (this.disposed || generation !== this.generation) return
    this.draw(next)
    this.callbacks.onTime?.(next)
  }

  draw(time: number) {
    const ctx = this.canvas.getContext('2d')
    if (!ctx || !this.project || this.disposed) return
    const { width, height } = this.canvas
    ctx.save(); ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, width, height)
    const active = clipAt(this.project, time)
    if (active) {
      const clip = active.clip
      const key = `visual:${clip.assetId}`
      const source = this.images.get(key) ?? this.media.get(key)
      ctx.globalAlpha = fadeAt(time - active.start, clipDuration(clip), clip.fadeIn, clip.fadeOut)
      if (!clip.assetId) { ctx.fillStyle = clip.color; ctx.fillRect(0, 0, width, height) }
      else if (source instanceof HTMLImageElement || source instanceof HTMLVideoElement) {
        const sw = source instanceof HTMLImageElement ? source.naturalWidth : source.videoWidth
        const sh = source instanceof HTMLImageElement ? source.naturalHeight : source.videoHeight
        if (sw && sh && (!(source instanceof HTMLVideoElement) || source.readyState >= 2)) {
          const scale = clip.fit === 'cover' ? Math.max(width / sw, height / sh) : Math.min(width / sw, height / sh)
          ctx.filter = LOOKS.find(look => look.id === clip.look)?.filter ?? 'none'
          ctx.drawImage(source, (width - sw * scale) / 2, (height - sh * scale) / 2, sw * scale, sh * scale)
          ctx.filter = 'none'
        }
      }
    }
    ctx.restore()
    for (const title of this.project.titles) if (time >= title.start && time < title.start + title.duration) drawTitle(ctx, title, width, height)
  }

  async play(from = this.current) {
    if (!this.project || !projectDuration(this.project)) return
    await this.enableAudio()
    await this.seek(from >= projectDuration(this.project) ? 0 : from)
    if (this.disposed) return
    this.playing = true
    const generation = ++this.generation
    this.baseTime = this.current; this.baseWall = performance.now(); this.activeKey = ''
    const tick = async () => {
      if (!this.playing || this.disposed || generation !== this.generation || !this.project) return
      try {
        const duration = projectDuration(this.project)
        const time = Math.min(duration, this.baseTime + (performance.now() - this.baseWall) / 1000)
        if (time >= duration) { this.current = duration; this.pause(); this.callbacks.onTime?.(duration); this.callbacks.onEnded?.(); return }
        const slots = this.slots(time)
        const key = this.keyAt(time, slots)
        if (key !== this.activeKey || slots.some(slot => Math.abs(slot.element.currentTime - slot.time) > 0.3 || slot.element.readyState < 2)) {
          this.callbacks.onBuffering?.(true)
          if (this.recorder?.state === 'recording') this.recorder.pause()
          this.pauseMedia()
          await Promise.all(slots.map(async slot => { slot.element.playbackRate = slot.speed; await seekMedia(slot.element, slot.time) }))
          if (!this.playing || this.disposed || generation !== this.generation) return
          await Promise.all(slots.map(slot => slot.element.play()))
          if (!this.playing || this.disposed || generation !== this.generation) { this.pauseMedia(); return }
          this.activeKey = key
          this.baseTime = time; this.baseWall = performance.now()
          this.callbacks.onBuffering?.(false)
          if (this.recorder?.state === 'paused') this.recorder.resume()
        }
        this.setVolumes(slots)
        this.current = time
        this.draw(time)
        this.callbacks.onTime?.(time)
        this.raf = requestAnimationFrame(() => { void tick() })
      } catch (error) {
        if (!this.disposed && generation === this.generation) { this.pause(); this.callbacks.onError?.(error instanceof Error ? error.message : 'Playback could not start.') }
      }
    }
    await tick()
  }

  pause() {
    this.playing = false
    cancelAnimationFrame(this.raf)
    this.pauseMedia()
    this.callbacks.onBuffering?.(false)
  }

  setRecorder(recorder: MediaRecorder) { this.recorder = recorder }
  getAudioStream() { return this.destination?.stream }

  dispose() {
    this.disposed = true; this.generation++; this.pause()
    for (const element of this.media.values()) releaseMedia(element)
    this.media.clear(); this.images.clear(); this.gains.clear(); this.loading.clear()
    void this.audioContext?.close().catch(() => {})
    this.host.remove()
  }
}

export function exportFormats() {
  if (typeof MediaRecorder === 'undefined' || typeof HTMLCanvasElement.prototype.captureStream !== 'function') return []
  const formats = [
    { label: 'MP4', extension: 'mp4', mime: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2' },
    { label: 'WebM', extension: 'webm', mime: 'video/webm;codecs=vp9,opus' },
    { label: 'WebM', extension: 'webm', mime: 'video/webm;codecs=vp8,opus' },
    { label: 'MP4', extension: 'mp4', mime: 'video/mp4' },
  ]
  return formats.filter((format, index) => MediaRecorder.isTypeSupported(format.mime) && !formats.slice(0, index).some(prior => prior.extension === format.extension && MediaRecorder.isTypeSupported(prior.mime)))
}

export async function exportMovie(project: LabProject, urls: Map<string, string>, options: { resolution: 720 | 1080; mime: string; signal: AbortSignal; onProgress: (progress: number) => void }) {
  const duration = projectDuration(project)
  if (duration <= 0) throw new Error('Add a clip or title before exporting.')
  const canvas = document.createElement('canvas')
  Object.assign(canvas, dimensions(project.ratio, options.resolution))
  let engine: LabEngine | undefined
  let stream: MediaStream | undefined
  let recorder: MediaRecorder | undefined
  let abort: (() => void) | undefined
  let visibility: (() => void) | undefined
  let stopped = false
  try {
    const blob = await new Promise<Blob>((resolve, reject) => {
      const fail = (error: Error) => { stopped = true; if (recorder && recorder.state !== 'inactive') recorder.stop(); reject(error) }
      abort = () => fail(new DOMException('Export canceled.', 'AbortError'))
      visibility = () => { if (document.hidden) fail(new Error('Export stopped when Lab went into the background. Keep this tab visible and try again.')) }
      options.signal.addEventListener('abort', abort, { once: true })
      document.addEventListener('visibilitychange', visibility)
      if (options.signal.aborted) { abort(); return }
      engine = new LabEngine(canvas, {
        onTime: time => options.onProgress(Math.min(0.99, time / duration)),
        onEnded: () => { if (recorder && recorder.state !== 'inactive') recorder.stop() },
        onError: message => fail(new Error(message)),
      })
      const active = engine
      // Create/resume audio within the user's export gesture, before loading media.
      const audioReady = active.enableAudio(false)
      void (async () => {
        await audioReady
        if (stopped) return
        await active.update(project, urls)
        if (stopped) return
        await active.enableAudio(false)
        if (options.signal.aborted || stopped) return
        await active.seek(0)
        if (stopped) return
        stream = canvas.captureStream(30)
        for (const track of active.getAudioStream()?.getAudioTracks() ?? []) stream.addTrack(track)
        recorder = new MediaRecorder(stream, { mimeType: options.mime, videoBitsPerSecond: options.resolution === 1080 ? 8000000 : 4500000, audioBitsPerSecond: 192000 })
        const chunks: Blob[] = []
        recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data) }
        recorder.onerror = () => fail(new Error('Your browser could not finish encoding this movie. Try 720p or another export format.'))
        recorder.onstop = () => resolve(new Blob(chunks, { type: options.mime.split(';')[0] }))
        active.setRecorder(recorder)
        recorder.start(1000)
        await active.play(0)
      })().catch(error => fail(error instanceof Error ? error : new Error('Export failed.')))
    })
    if (options.signal.aborted) throw new DOMException('Export canceled.', 'AbortError')
    if (!blob.size) throw new Error('The browser returned an empty export. Please try again.')
    const result = options.mime.includes('webm') ? await finalizeWebm(blob, duration) : blob
    options.onProgress(1)
    return result
  } finally {
    if (abort) options.signal.removeEventListener('abort', abort)
    if (visibility) document.removeEventListener('visibilitychange', visibility)
    if (recorder && recorder.state !== 'inactive') recorder.stop()
    stream?.getTracks().forEach(track => track.stop())
    engine?.dispose()
  }
}
