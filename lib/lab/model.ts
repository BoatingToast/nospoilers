export const LAB_VERSION = 1
export const MIN_CLIP = 0.1
export const MAX_MEDIA_BYTES = 1024 * 1024 * 1024

export type AssetKind = 'video' | 'image' | 'audio'
export type AspectRatio = '16:9' | '9:16' | '1:1'
export type Look = 'original' | 'cinema' | 'warm' | 'mono' | 'faded'

export interface LabAsset {
  id: string
  name: string
  kind: AssetKind
  mime: string
  size: number
  duration: number
  width: number
  height: number
  thumbnail?: string
}

export interface LabClip {
  id: string
  assetId: string | null
  name: string
  in: number
  out: number
  speed: number
  volume: number
  fit: 'contain' | 'cover'
  look: Look
  fadeIn: number
  fadeOut: number
  color: string
}

export interface LabTitle {
  id: string
  text: string
  start: number
  duration: number
  size: number
  position: 'top' | 'center' | 'bottom'
  color: string
  backdrop: boolean
}

export interface LabAudio {
  id: string
  assetId: string
  name: string
  start: number
  in: number
  out: number
  volume: number
  fadeIn: number
  fadeOut: number
}

export interface LabProject {
  version: 1
  id: string
  name: string
  createdAt: number
  updatedAt: number
  ratio: AspectRatio
  assets: LabAsset[]
  clips: LabClip[]
  titles: LabTitle[]
  audio: LabAudio[]
  notes: string
}

export type Selection = { kind: 'clip' | 'title' | 'audio'; id: string } | null
export const uid = () => crypto.randomUUID()
export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min))
export const roundTime = (value: number) => Math.round(value * 1000) / 1000

export function newProject(name = 'Untitled film'): LabProject {
  const now = Date.now()
  return { version: 1, id: uid(), name, createdAt: now, updatedAt: now, ratio: '16:9', assets: [], clips: [], titles: [], audio: [], notes: '' }
}

export function newClip(asset?: LabAsset): LabClip {
  return {
    id: uid(), assetId: asset?.id ?? null, name: asset?.name ?? 'Color card',
    in: 0, out: asset?.kind === 'video' ? asset.duration : 4, speed: 1, volume: 1,
    fit: 'contain', look: 'original', fadeIn: 0, fadeOut: 0, color: '#0b0f24',
  }
}

export function clipDuration(clip: LabClip) { return (clip.out - clip.in) / clip.speed }

export function sequence(clips: LabClip[]) {
  let start = 0
  return clips.map(clip => {
    const entry = { clip, start, end: start + clipDuration(clip) }
    start = entry.end
    return entry
  })
}

export function projectDuration(project: LabProject) {
  return Math.max(0, project.clips.reduce((sum, clip) => sum + clipDuration(clip), 0),
    ...project.titles.map(title => title.start + title.duration),
    ...project.audio.map(audio => audio.start + audio.out - audio.in))
}

export function clipAt(project: LabProject, time: number) {
  return sequence(project.clips).find(entry => time >= entry.start && time < entry.end)
}

export function splitClip(project: LabProject, id: string, time: number): LabProject {
  const entry = sequence(project.clips).find(item => item.clip.id === id)
  if (!entry || time - entry.start < MIN_CLIP || entry.end - time < MIN_CLIP) return project
  const cut = roundTime(entry.clip.in + (time - entry.start) * entry.clip.speed)
  const first = { ...entry.clip, out: cut, fadeOut: 0 }
  const second = { ...entry.clip, id: uid(), in: cut, fadeIn: 0 }
  return { ...project, clips: project.clips.flatMap(clip => clip.id === id ? [first, second] : [clip]) }
}

export function moveClip(project: LabProject, id: string, target: number): LabProject {
  const index = project.clips.findIndex(clip => clip.id === id)
  if (index < 0) return project
  const clips = [...project.clips]
  const [clip] = clips.splice(index, 1)
  clips.splice(clamp(target, 0, clips.length), 0, clip)
  return { ...project, clips }
}

export function normalizeClip(clip: LabClip, asset?: LabAsset): LabClip {
  const max = asset?.kind === 'video' ? asset.duration : 3600
  const speed = clamp(clip.speed, 0.25, 4)
  const start = clamp(clip.in, 0, Math.max(0, max - MIN_CLIP))
  const end = clamp(clip.out, start + MIN_CLIP, max)
  const duration = (end - start) / speed
  return { ...clip, in: roundTime(start), out: roundTime(end), speed, volume: clamp(clip.volume, 0, 2), fadeIn: clamp(clip.fadeIn, 0, duration / 2), fadeOut: clamp(clip.fadeOut, 0, duration / 2) }
}

export function fadeAt(local: number, duration: number, fadeIn: number, fadeOut: number) {
  return clamp(Math.min(fadeIn > 0 ? local / fadeIn : 1, fadeOut > 0 ? (duration - local) / fadeOut : 1), 0, 1)
}

export function dimensions(ratio: AspectRatio, resolution: 720 | 1080 = 720) {
  if (ratio === '9:16') return { width: resolution, height: resolution === 720 ? 1280 : 1920 }
  if (ratio === '1:1') return { width: resolution, height: resolution }
  return { width: resolution === 720 ? 1280 : 1920, height: resolution }
}

export function formatTime(time: number, frames = false) {
  const value = Math.max(0, Number.isFinite(time) ? time : 0)
  const minutes = Math.floor(value / 60).toString().padStart(2, '0')
  const seconds = Math.floor(value % 60).toString().padStart(2, '0')
  return `${minutes}:${seconds}${frames ? `:${Math.floor(value % 1 * 30).toString().padStart(2, '0')}` : ''}`
}

export function formatBytes(bytes: number) {
  return bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(1)} GB` : `${(bytes / 1024 ** 2).toFixed(1)} MB`
}

// Backup data is untrusted. Validate before creating URLs or writing anything to storage.
export function parseProject(value: unknown): LabProject {
  const fail = (): never => { throw new Error('This is not a valid NoSpoilers Lab project backup.') }
  if (!value || typeof value !== 'object') return fail()
  const p = value as LabProject
  const str = (x: unknown, max = 500) => typeof x === 'string' && x.length <= max
  const num = (x: unknown, min = 0, max = 86400) => typeof x === 'number' && Number.isFinite(x) && x >= min && x <= max
  const color = (x: unknown) => typeof x === 'string' && /^#[\da-f]{6}$/i.test(x)
  const id = (x: unknown) => typeof x === 'string' && /^[a-zA-Z0-9-]{1,100}$/.test(x)
  if (p.version !== LAB_VERSION || !id(p.id) || !str(p.name, 120) || !str(p.notes, 50000) || !num(p.createdAt, 0, Number.MAX_SAFE_INTEGER) || !num(p.updatedAt, 0, Number.MAX_SAFE_INTEGER) || !['16:9', '9:16', '1:1'].includes(p.ratio)) return fail()
  for (const list of [p.assets, p.clips, p.titles, p.audio]) {
    if (!Array.isArray(list) || list.length > 1000 || list.some(item => !item || !id(item.id)) || new Set(list.map(item => item.id)).size !== list.length) return fail()
  }
  for (const a of p.assets) {
    if (!str(a.name) || !['video', 'audio', 'image'].includes(a.kind) || !str(a.mime, 100) || !num(a.duration) || !num(a.size, 0, MAX_MEDIA_BYTES) || !num(a.width, 0, 32768) || !num(a.height, 0, 32768)) return fail()
    if (a.thumbnail !== undefined && (!str(a.thumbnail, 300000) || !/^data:image\/(jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(a.thumbnail))) return fail()
  }
  for (const c of p.clips) {
    const asset = p.assets.find(a => a.id === c.assetId)
    if (!str(c.name) || (c.assetId !== null && (!asset || asset.kind === 'audio')) || !num(c.in) || !num(c.out, c.in + MIN_CLIP - 0.00001) || !num(c.speed, 0.25, 4) || !num(c.volume, 0, 2) || !num(c.fadeIn) || !num(c.fadeOut) || !color(c.color) || !['contain', 'cover'].includes(c.fit) || !['original', 'cinema', 'warm', 'mono', 'faded'].includes(c.look)) return fail()
    if (asset?.kind === 'video' && c.out > asset.duration + 0.01) return fail()
  }
  for (const t of p.titles) {
    if (!str(t.text, 2000) || !num(t.start) || !num(t.duration, MIN_CLIP) || !num(t.size, 12, 160) || !['top', 'center', 'bottom'].includes(t.position) || !color(t.color) || typeof t.backdrop !== 'boolean') return fail()
  }
  for (const a of p.audio) {
    const asset = p.assets.find(item => item.id === a.assetId)
    if (!asset || asset.kind !== 'audio' || !str(a.name) || !num(a.start) || !num(a.in) || !num(a.out, a.in + MIN_CLIP - 0.00001) || a.out > asset.duration + 0.01 || !num(a.volume, 0, 2) || !num(a.fadeIn) || !num(a.fadeOut)) return fail()
  }
  if (projectDuration(p) > 86400) return fail()
  return p
}
