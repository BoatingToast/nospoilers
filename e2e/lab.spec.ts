import { expect, test, type Page } from '@playwright/test'
import { encode } from 'next-auth/jwt'
import { readFile } from 'node:fs/promises'
import { memberSession, mockMemberSession } from './support/session'

async function panel(page: Page, name: 'media' | 'preview' | 'inspector') {
  await expect(page.getByLabel('Project name')).toBeVisible()
  const navigation = page.getByRole('navigation', { name: 'Editor panels' })
  if (await navigation.isVisible()) await navigation.getByRole('button', { name, exact: true }).click()
}

async function setNumber(page: Page, label: string, value: string) {
  await page.getByLabel(label, { exact: true }).fill(value)
  await page.getByLabel(label, { exact: true }).press('Tab')
}

function wav() {
  const samples = 48000 * 4
  const buffer = Buffer.alloc(44 + samples * 2)
  buffer.write('RIFF', 0); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write('WAVEfmt ', 8)
  buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(48000, 24); buffer.writeUInt32LE(96000, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36); buffer.writeUInt32LE(samples * 2, 40)
  for (let i = 0; i < samples; i++) buffer.writeInt16LE(Math.round(Math.sin(i / 48000 * Math.PI * 2 * 880) * 10000), 44 + i * 2)
  return buffer
}

async function videoFixture(page: Page) {
  const bytes = await page.evaluate(async () => {
    const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 180
    const ctx = canvas.getContext('2d')!
    const stream = canvas.captureStream(30)
    const audio = new AudioContext(); await audio.resume()
    const destination = audio.createMediaStreamDestination()
    const oscillator = audio.createOscillator(); oscillator.frequency.value = 440
    const gain = audio.createGain(); gain.gain.value = 0.2
    oscillator.connect(gain); gain.connect(destination); oscillator.start()
    stream.addTrack(destination.stream.getAudioTracks()[0])
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' })
    const chunks: Blob[] = []
    recorder.ondataavailable = event => chunks.push(event.data)
    const done = new Promise<Blob>(resolve => { recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' })) })
    const start = performance.now()
    const draw = () => { ctx.fillStyle = '#dc2424'; ctx.fillRect(0, 0, 320, 180); ctx.fillStyle = '#ffffff'; ctx.fillRect(((performance.now() - start) / 15) % 280, 70, 25, 25) }
    draw(); recorder.start()
    const interval = setInterval(draw, 1000 / 30)
    await new Promise(resolve => setTimeout(resolve, 2600))
    recorder.stop(); clearInterval(interval)
    const blob = await done; stream.getTracks().forEach(track => track.stop())
    oscillator.stop(); await audio.close()
    return Array.from(new Uint8Array(await blob.arrayBuffer()))
  })
  return { name: 'opening.webm', mimeType: 'video/webm', buffer: Buffer.from(bytes) }
}

test.beforeEach(async ({ page, context, baseURL }) => {
  test.skip(Boolean(process.env.E2E_BASE_URL) && !process.env.E2E_UPLOAD_TEST_SESSION, 'Requires the local fixture session secret.')
  await mockMemberSession(page)
  const token = await encode({ secret: 'nospoilers-e2e-secret', token: memberSession.user, maxAge: 3600 })
  await context.addCookies([{ name: 'next-auth.session-token', value: token, url: baseURL!, httpOnly: true, sameSite: 'Lax' }])
})

test('a signed-out visitor is redirected and Lab is not indexed', async ({ page, context }) => {
  await context.clearCookies()
  const response = await page.goto('/lab')
  await expect(page).toHaveURL(/\/login\?callbackUrl=%2Flab/)
  expect(response?.headers()['x-robots-tag']).toContain('noindex')
})

test('starter projects edit, split, undo, save, restore, and remain usable on mobile', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message))
  await page.goto('/lab')
  await expect(page.getByRole('heading', { name: /YOUR NEXT FILM/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create a film', exact: true })).toBeEnabled()
  await page.screenshot({ path: testInfo.outputPath('lab-projects.png'), fullPage: true })
  await page.getByRole('button', { name: 'Try a starter film' }).click()
  await page.getByLabel('Project name').fill('Friday premiere')
  await page.getByLabel('Project name').press('Tab')
  await page.getByRole('button', { name: 'Select shot 1: Opening' }).click()
  await setNumber(page, 'Duration (s)', '2')
  await expect(page.getByLabel('Duration (s)', { exact: true })).toHaveValue('2')
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await page.getByRole('button', { name: 'Select shot 1: Opening' }).click()
  await expect(page.getByLabel('Duration (s)', { exact: true })).toHaveValue('4')
  await panel(page, 'preview')
  await expect(page.getByRole('button', { name: 'Play preview' })).toBeEnabled()
  await page.getByLabel('Playhead position').fill('1')
  await page.getByRole('button', { name: 'Split', exact: true }).click()
  await expect(page.getByRole('button', { name: /^Select shot/ })).toHaveCount(4)
  await expect(page.getByRole('button', { name: 'Redo', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Play preview' }).click()
  await expect(page.getByRole('button', { name: 'Pause preview' })).toBeVisible()
  await expect.poll(async () => Number(await page.getByLabel('Playhead position').inputValue())).toBeGreaterThan(1.1)
  await page.getByRole('button', { name: 'Pause preview' }).click()
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await page.screenshot({ path: testInfo.outputPath('lab-editor.png'), fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  const backupDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download project backup', exact: true }).click()
  const backup = await backupDownload
  const backupPath = testInfo.outputPath(backup.suggestedFilename()); await backup.saveAs(backupPath)
  await expect(page.getByLabel('Project name')).toBeEnabled()
  await page.reload()
  await page.getByRole('button', { name: 'Open Friday premiere', exact: true }).click()
  await expect(page.getByRole('button', { name: /^Select shot/ })).toHaveCount(4)
  await page.getByRole('button', { name: 'Back to projects' }).click()
  await page.getByLabel('Restore project backup').setInputFiles(backupPath)
  await expect(page.getByLabel('Project name')).toHaveValue('Friday premiere')
  await expect(page.getByRole('button', { name: /^Select shot/ })).toHaveCount(4)
  await page.getByRole('button', { name: 'Back to projects' }).click()
  await expect(page.getByRole('button', { name: 'Open Friday premiere', exact: true })).toHaveCount(2)
  expect(errors).toEqual([])
})

test('real footage can be trimmed, mixed with audio, titled, exported and reopened with originals', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message))
  await page.goto('/lab')
  await page.getByRole('button', { name: 'Create a film', exact: true }).click()
  const video = await videoFixture(page)
  await page.getByLabel('Import media files').setInputFiles([video, { name: 'score.wav', mimeType: 'audio/wav', buffer: wav() }])
  await page.getByRole('button', { name: 'Add opening.webm to timeline', exact: true }).click()
  await page.getByRole('button', { name: 'Select shot 1: opening.webm' }).click()
  await setNumber(page, 'Source in (s)', '0.2')
  await setNumber(page, 'Source out (s)', '2.2')
  await page.getByLabel('Playback speed').selectOption('2')
  await page.getByRole('button', { name: 'Duplicate', exact: true }).click()
  await expect(page.getByRole('button', { name: /^Select shot/ })).toHaveCount(2)
  await panel(page, 'preview')
  await expect(page.getByRole('button', { name: 'Play preview' })).toBeEnabled()
  await page.getByLabel('Playhead position').fill('0')
  await panel(page, 'media')
  await page.getByRole('button', { name: 'Add score.wav to timeline', exact: true }).click()
  await panel(page, 'media')
  await page.getByRole('tab', { name: 'titles', exact: true }).click()
  await page.getByRole('button', { name: /Manual subtitle/ }).click()
  await page.getByLabel('Title text').fill('A real first cut.')
  await panel(page, 'preview')
  await expect(page.getByRole('button', { name: 'Export film' })).toBeEnabled()
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await page.screenshot({ path: testInfo.outputPath('lab-footage.png'), fullPage: true })
  await page.getByRole('button', { name: 'Export film' }).click()
  await page.getByLabel('Export format').selectOption({ label: 'WebM' })
  await page.getByRole('button', { name: 'Render movie' }).click()
  await expect(page.getByRole('heading', { name: 'Your film is ready.' })).toBeVisible({ timeout: 30000 })
  const downloadEvent = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download movie', exact: true }).click()
  const download = await downloadEvent
  const path = testInfo.outputPath(download.suggestedFilename()); await download.saveAs(path)
  const bytes = Array.from(await readFile(path))
  const decoded = await page.evaluate(async movie => {
    const blob = new Blob([new Uint8Array(movie)], { type: 'video/webm' })
    const url = URL.createObjectURL(blob)
    const video = document.createElement('video'); video.muted = true; video.playsInline = true
    document.body.appendChild(video)
    const ready = new Promise<void>((resolve, reject) => { video.onloadeddata = () => resolve(); video.onerror = () => reject(new Error('Export could not decode')) })
    video.src = url; await ready
    const duration = video.duration
    const frames: number[][] = []
    let textPixels = 0
    for (const time of [0.3, 1.5]) {
      const sought = new Promise<void>(resolve => { video.onseeked = () => resolve() }); video.currentTime = time; await sought
      const canvas = document.createElement('canvas'); canvas.width = video.videoWidth; canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')!; ctx.drawImage(video, 0, 0)
      frames.push(Array.from(ctx.getImageData(20, 20, 1, 1).data))
      const subtitle = ctx.getImageData(400, 580, 480, 100).data
      for (let i = 0; i < subtitle.length; i += 4) if (subtitle[i] > 200 && subtitle[i + 1] > 200 && subtitle[i + 2] > 200) textPixels++
    }
    const audio = new AudioContext()
    const decoded = await audio.decodeAudioData(await blob.arrayBuffer())
    const samples = decoded.getChannelData(0)
    let energy = 0; for (const value of samples) energy += value * value
    const amplitude = (frequency: number) => {
      let real = 0; let imaginary = 0
      const start = Math.floor(decoded.sampleRate * 0.3); const count = Math.floor(decoded.sampleRate * 0.4)
      for (let i = 0; i < count; i++) { const angle = 2 * Math.PI * frequency * i / decoded.sampleRate; real += samples[start + i] * Math.cos(angle); imaginary += samples[start + i] * Math.sin(angle) }
      return 2 * Math.hypot(real, imaginary) / count
    }
    const originalSound = amplitude(440); const score = amplitude(880)
    await audio.close(); video.remove(); URL.revokeObjectURL(url)
    return { duration, frames, textPixels, width: video.videoWidth, audioRms: Math.sqrt(energy / samples.length), originalSound, score }
  }, bytes)
  expect(decoded.duration).toBeCloseTo(2, 1)
  expect(decoded.width).toBe(1280)
  expect(decoded.audioRms).toBeGreaterThan(0.03)
  expect(decoded.originalSound).toBeGreaterThan(0.03)
  expect(decoded.score).toBeGreaterThan(0.03)
  expect(decoded.textPixels).toBeGreaterThan(100)
  for (const frame of decoded.frames) { expect(frame[0]).toBeGreaterThan(150); expect(frame[1]).toBeLessThan(90) }
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click()
  await page.reload()
  await page.getByRole('button', { name: 'Open Untitled film', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Export film' })).toBeEnabled()
  await expect(page.getByRole('button', { name: /^Select shot/ })).toHaveCount(2)
  await panel(page, 'media')
  await expect(page.getByRole('button', { name: 'Add opening.webm to timeline', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add score.wav to timeline', exact: true })).toBeVisible()
  const backupEvent = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download project backup', exact: true }).click()
  const backup = await backupEvent
  const backupPath = testInfo.outputPath(backup.suggestedFilename()); await backup.saveAs(backupPath)
  await expect(page.getByLabel('Project name')).toBeEnabled()
  await page.getByRole('button', { name: 'Back to projects' }).click()
  await page.getByLabel('Restore project backup').setInputFiles(backupPath)
  await expect(page.getByRole('button', { name: 'Export film' })).toBeEnabled()
  await panel(page, 'preview')
  const restoredPixel = await page.getByLabel('Movie preview canvas').evaluate(canvas => Array.from((canvas as HTMLCanvasElement).getContext('2d')!.getImageData(20, 20, 1, 1).data))
  expect(restoredPixel[0]).toBeGreaterThan(150)
  expect(errors).toEqual([])
})

test('supported MP4 exports retain portrait dimensions and play as a real movie', async ({ page }, testInfo) => {
  await page.goto('/lab')
  await page.getByRole('button', { name: 'Create a film', exact: true }).click()
  await panel(page, 'media')
  await page.getByRole('button', { name: 'Add a color card', exact: true }).click()
  await setNumber(page, 'Duration (s)', '1')
  await panel(page, 'preview')
  await page.getByLabel('Canvas aspect ratio').selectOption('9:16')
  await expect(page.getByRole('button', { name: 'Export film' })).toBeEnabled()
  await page.getByRole('button', { name: 'Export film' }).click()
  test.skip(await page.getByLabel('Export format').getByRole('option', { name: 'MP4', exact: true }).count() === 0, 'This browser does not expose an MP4 encoder.')
  await page.getByLabel('Export format').selectOption({ label: 'MP4' })
  await page.getByLabel('Export resolution', { exact: true }).selectOption('1080')
  await page.getByRole('button', { name: 'Render movie' }).click()
  await expect(page.getByRole('heading', { name: 'Your film is ready.' })).toBeVisible({ timeout: 30000 })
  const downloadEvent = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download movie', exact: true }).click()
  const download = await downloadEvent
  const path = testInfo.outputPath(download.suggestedFilename()); await download.saveAs(path)
  const bytes = Array.from(await readFile(path))
  const movie = await page.evaluate(async bytes => {
    const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'video/mp4' }))
    const video = document.createElement('video'); video.muted = true; video.playsInline = true
    const ready = new Promise<void>((resolve, reject) => { video.onloadeddata = () => resolve(); video.onerror = () => reject(new Error('MP4 could not decode')) })
    video.src = url; await ready
    const result = { width: video.videoWidth, height: video.videoHeight, duration: video.duration }
    video.removeAttribute('src'); video.load(); URL.revokeObjectURL(url)
    return result
  }, bytes)
  expect(movie.width).toBe(1080); expect(movie.height).toBe(1920)
  expect(movie.duration).toBeGreaterThan(0.8); expect(movie.duration).toBeLessThan(1.3)
})

test('bad files report an error without damaging the project and export cancellation recovers', async ({ page }) => {
  await page.goto('/lab')
  await page.getByRole('button', { name: 'Try a starter film' }).click()
  await page.getByLabel('Import media files').setInputFiles({ name: 'broken.mp4', mimeType: 'video/mp4', buffer: Buffer.from('not a movie') })
  await expect(page.getByRole('main').getByRole('alert')).toContainText('cannot decode')
  await expect(page.getByRole('button', { name: /^Select shot/ })).toHaveCount(3)
  await page.getByRole('button', { name: 'Export film' }).click()
  await page.getByRole('button', { name: 'Render movie' }).click()
  await page.getByRole('button', { name: 'Cancel export', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Render movie' })).toBeEnabled()
  await page.getByRole('button', { name: 'Close dialog' }).click()
  await panel(page, 'preview')
  await page.getByRole('button', { name: 'Play preview' }).click()
  await expect(page.getByRole('button', { name: 'Pause preview' })).toBeVisible()
})
