import assert from 'node:assert/strict'
import test from 'node:test'
// @ts-expect-error explicit TypeScript extension is intentional for node:test
import { clipAt, clipDuration, dimensions, fadeAt, moveClip, newClip, newProject, normalizeClip, parseProject, projectDuration, sequence, splitClip, type LabAsset } from '../lib/lab/model.ts'
// @ts-expect-error explicit TypeScript extension is intentional for node:test
import { finalizeWebm } from '../lib/lab/webm.ts'

const asset: LabAsset = { id: 'asset-1', name: 'scene.mp4', kind: 'video', mime: 'video/mp4', size: 100, duration: 20, width: 1920, height: 1080 }

test('split uses source time at playback speed and preserves the movie duration', () => {
  const project = newProject()
  project.assets = [asset]
  project.clips = [{ ...newClip(asset), in: 2, out: 14, speed: 2, fadeIn: 0.3, fadeOut: 0.4 }]
  const result = splitClip(project, project.clips[0].id, 2)
  assert.equal(result.clips.length, 2)
  assert.deepEqual(result.clips.map(clip => [clip.in, clip.out]), [[2, 6], [6, 14]])
  assert.equal(projectDuration(result), 6)
  assert.equal(result.clips[0].fadeOut, 0)
  assert.equal(result.clips[1].fadeIn, 0)
  assert.equal(result.clips[0].fadeIn, 0.3)
  assert.equal(result.clips[1].fadeOut, 0.4)
  assert.notEqual(result.clips[0].id, result.clips[1].id)
  assert.equal(splitClip(project, project.clips[0].id, 0), project)
  assert.equal(splitClip(project, project.clips[0].id, 6), project)
})

test('reordering ripples pictures while text and audio keep explicit timestamps', () => {
  const project = newProject()
  project.clips = [{ ...newClip(), out: 2 }, { ...newClip(), out: 5 }, { ...newClip(), out: 3 }]
  project.titles = [{ id: 'title-1', text: 'Ending', start: 8, duration: 4, size: 36, color: '#ffffff', position: 'center', backdrop: false }]
  const result = moveClip(project, project.clips[0].id, 2)
  assert.deepEqual(sequence(result.clips).map(item => item.start), [0, 5, 8])
  assert.equal(result.clips[2].id, project.clips[0].id)
  assert.equal(result.titles[0].start, 8)
  assert.equal(projectDuration(result), 12)
  assert.equal(clipAt(result, 5)?.clip.id, result.clips[1].id)
  assert.equal(clipAt(result, 10), undefined)
})

test('trimming cannot create invalid ranges or extend beyond the original video', () => {
  const clip = normalizeClip({ ...newClip(asset), in: 30, out: -4, speed: 0, volume: 100, fadeIn: 100, fadeOut: -1 }, asset)
  assert.ok(clip.in >= 0 && clip.in < 20)
  assert.ok(clip.out > clip.in && clip.out <= 20)
  assert.equal(clip.speed, 0.25)
  assert.equal(clip.volume, 2)
  assert.ok(clip.fadeIn <= clipDuration(clip) / 2)
  assert.equal(clip.fadeOut, 0)
})

test('fade envelopes and output dimensions stay consistent across preview/export', () => {
  assert.equal(fadeAt(0, 4, 1, 1), 0)
  assert.equal(fadeAt(0.5, 4, 1, 1), 0.5)
  assert.equal(fadeAt(2, 4, 1, 1), 1)
  assert.equal(fadeAt(3.5, 4, 1, 1), 0.5)
  assert.equal(fadeAt(4, 4, 1, 1), 0)
  assert.deepEqual(dimensions('16:9', 1080), { width: 1920, height: 1080 })
  assert.deepEqual(dimensions('9:16'), { width: 720, height: 1280 })
  assert.deepEqual(dimensions('1:1'), { width: 720, height: 720 })
})

test('backup validation rejects dangling media, invalid trims, unsupported versions and injected thumbnails', () => {
  const project = newProject()
  project.assets = [asset]
  project.clips = [newClip(asset)]
  assert.deepEqual(parseProject(project), project)
  assert.throws(() => parseProject({ ...project, version: 2 }))
  assert.throws(() => parseProject({ ...project, assets: [] }))
  assert.throws(() => parseProject({ ...project, clips: [{ ...project.clips[0], out: 21 }] }))
  assert.throws(() => parseProject({ ...project, clips: [{ ...project.clips[0], speed: NaN }] }))
  assert.throws(() => parseProject({ ...project, assets: [{ ...asset, thumbnail: 'https://untrusted.example/image.png' }] }))
  assert.throws(() => parseProject({ ...project, assets: [{ ...asset, id: '../path' }] }))
  assert.throws(() => parseProject({ ...project, assets: [asset, asset] }))
  assert.throws(() => parseProject({ ...project, audio: [{ id: 'audio-1', assetId: asset.id, name: 'Wrong type', start: 0, in: 0, out: 1, volume: 1, fadeIn: 0, fadeOut: 0 }] }))
})

test('WebM finalization adds a finite duration to a recorder segment without changing frames', async () => {
  const header = [0x1a, 0x45, 0xdf, 0xa3, 0x80]
  const segment = [0x18, 0x53, 0x80, 0x67, 0xff]
  const info = [0x15, 0x49, 0xa9, 0x66, 0x87, 0x2a, 0xd7, 0xb1, 0x83, 0x0f, 0x42, 0x40]
  const frames = [0x1f, 0x43, 0xb6, 0x75, 0x83, 1, 2, 3]
  const output = await finalizeWebm(new Blob([new Uint8Array([...header, ...segment, ...info, ...frames])], { type: 'video/webm' }), 3.25)
  const bytes = new Uint8Array(await output.arrayBuffer())
  assert.deepEqual(Array.from(bytes.slice(-frames.length)), frames)
  assert.equal(bytes[14], 0x92)
  assert.deepEqual(Array.from(bytes.slice(22, 25)), [0x44, 0x89, 0x88])
  assert.equal(new DataView(bytes.buffer).getFloat64(25), 3250)
  assert.equal(output.type, 'video/webm')
  await assert.rejects(() => finalizeWebm(new Blob(['not a video']), 1))
})
