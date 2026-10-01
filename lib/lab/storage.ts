import { parseProject, uid, type LabProject } from './model'

export interface StoredMedia { projectId: string; id: string; blob: Blob }

export function openLabStorage(owner: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(`nospoilers-lab-${owner}`, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      db.createObjectStore('projects', { keyPath: 'id' })
      const media = db.createObjectStore('media', { keyPath: ['projectId', 'id'] })
      media.createIndex('projectId', 'projectId')
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('Local storage could not open. Allow site storage in your browser, then reload Lab.'))
    request.onblocked = () => reject(new Error('Close other NoSpoilers Lab tabs, then reload.'))
  })
}

function requestValue<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function committed(tx: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onabort = tx.onerror = () => reject(new Error(tx.error?.name === 'QuotaExceededError' ? 'Your browser storage is full. Download a backup and free space before importing more footage.' : 'Your project could not be saved. Download a backup before leaving Lab.'))
  })
}

export async function listProjects(db: IDBDatabase) {
  const list = await requestValue<LabProject[]>(db.transaction('projects').objectStore('projects').getAll())
  return list.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function saveProject(db: IDBDatabase, project: LabProject, media: StoredMedia[] = []) {
  const tx = db.transaction(['projects', 'media'], 'readwrite')
  const done = committed(tx)
  tx.objectStore('projects').put(project)
  for (const asset of media) tx.objectStore('media').put(asset)
  await done
}

export async function loadMedia(db: IDBDatabase, projectId: string) {
  return requestValue<StoredMedia[]>(db.transaction('media').objectStore('media').index('projectId').getAll(projectId))
}

export async function deleteProject(db: IDBDatabase, projectId: string) {
  const tx = db.transaction(['projects', 'media'], 'readwrite')
  const done = committed(tx)
  tx.objectStore('projects').delete(projectId)
  const request = tx.objectStore('media').index('projectId').openCursor(IDBKeyRange.only(projectId))
  request.onsuccess = () => { const cursor = request.result; if (cursor) { cursor.delete(); cursor.continue() } }
  await done
}

export async function makeBackup(project: LabProject, media: StoredMedia[]) {
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  zip.file('project.json', JSON.stringify(project, null, 2))
  for (const asset of project.assets) {
    const stored = media.find(item => item.id === asset.id)
    if (!stored) throw new Error(`Missing original file: ${asset.name}. Reimport it before backing up.`)
    zip.file(`media/${asset.id}`, stored.blob)
  }
  return zip.generateAsync({ type: 'blob', compression: 'STORE' })
}

export async function readBackup(file: File): Promise<{ project: LabProject; media: StoredMedia[] }> {
  if (file.size > 512 * 1024 * 1024) throw new Error('Please restore backups smaller than 512 MB in this version of Lab.')
  const { default: JSZip } = await import('jszip')
  const zip = await JSZip.loadAsync(file)
  const manifest = zip.file('project.json')
  if (!manifest || Object.keys(zip.files).length > 2005) throw new Error('Choose a NoSpoilers Lab .zip backup.')
  // Read sizes before inflating to reject oversized or compressed archive bombs.
  const sizeOf = (entry: unknown) => (entry as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? Infinity
  if (sizeOf(manifest) > 10 * 1024 * 1024 || Object.values(zip.files).reduce((sum, entry) => sum + (entry.dir ? 0 : sizeOf(entry)), 0) > 512 * 1024 * 1024) throw new Error('This backup is too large to restore in the browser.')
  const project = { ...parseProject(JSON.parse(await manifest.async('string'))), id: uid(), updatedAt: Date.now() }
  const media: StoredMedia[] = []
  for (const asset of project.assets) {
    const entry = zip.file(`media/${asset.id}`)
    if (!entry || sizeOf(entry) !== asset.size) throw new Error(`The backup is missing or has damaged footage: ${asset.name}.`)
    const bytes = await entry.async('arraybuffer')
    media.push({ projectId: project.id, id: asset.id, blob: new Blob([bytes], { type: asset.mime }) })
  }
  return { project, media }
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 60000)
}

export const safeFilename = (name: string) => name.replace(/[^a-zA-Z0-9 _-]/g, '').trim().slice(0, 100) || 'My film'
