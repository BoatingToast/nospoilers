import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const extensionDir = join(root, 'extension')
const manifest = JSON.parse(readFileSync(join(extensionDir, 'manifest.json'), 'utf8'))
const runtimeFiles = [
  'manifest.json',
  'background.js',
  'classifier.js',
  'content.css',
  'content.js',
  'popup.css',
  'popup.html',
  'popup.js',
  'shared.js',
  'icons/icon16.png',
  'icons/icon32.png',
  'icons/icon48.png',
  'icons/icon128.png',
]
const storeAssets = [
  ['store-assets/icon-128.png', 128, 128],
  ['store-assets/screenshot-1280x800.png', 1280, 800],
  ['store-assets/small-promo-440x280.png', 440, 280],
]

function pngSize(file) {
  const bytes = readFileSync(file)
  if (bytes.toString('ascii', 1, 4) !== 'PNG') throw new Error(`${file} is not a PNG`)
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

if (manifest.manifest_version !== 3) throw new Error('Chrome Web Store packages must use Manifest V3')
if (!/^\d+\.\d+\.\d+(?:\.\d+)?$/.test(manifest.version)) throw new Error('Manifest version is invalid')

for (const file of runtimeFiles) {
  if (!existsSync(join(extensionDir, file))) throw new Error(`Missing extension file: ${file}`)
}

for (const size of [16, 32, 48, 128]) {
  const dimensions = pngSize(join(extensionDir, `icons/icon${size}.png`))
  if (dimensions.width !== size || dimensions.height !== size) {
    throw new Error(`icon${size}.png must be exactly ${size}x${size}`)
  }
}

for (const [file, width, height] of storeAssets) {
  const path = join(extensionDir, file)
  if (!existsSync(path)) throw new Error(`Missing Chrome Web Store asset: ${file}`)
  const dimensions = pngSize(path)
  if (dimensions.width !== width || dimensions.height !== height) {
    throw new Error(`${file} must be exactly ${width}x${height}`)
  }
}

const distDir = join(root, 'dist')
const output = join(distDir, `nospoilers-shield-v${manifest.version}.zip`)
mkdirSync(dirname(output), { recursive: true })
if (existsSync(output)) rmSync(output)

const zip = spawnSync('zip', ['-X', '-q', output, ...runtimeFiles], {
  cwd: extensionDir,
  encoding: 'utf8',
})
if (zip.status !== 0) throw new Error(zip.stderr || 'zip failed')

const latest = join(distDir, 'nospoilers-shield-latest.zip')
copyFileSync(output, latest)
console.log(`Created ${output}`)
