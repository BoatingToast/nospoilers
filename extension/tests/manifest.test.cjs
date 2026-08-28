const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const extensionRoot = path.resolve(__dirname, '..')
const manifest = JSON.parse(fs.readFileSync(path.join(extensionRoot, 'manifest.json'), 'utf8'))

function pngSize(file) {
  const bytes = fs.readFileSync(file)
  assert.equal(bytes.toString('ascii', 1, 4), 'PNG', `${file} is not a PNG`)
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

test('extension uses Manifest V3', () => {
  assert.equal(manifest.manifest_version, 3)
  assert.equal(manifest.background.service_worker, 'background.js')
})

test('every manifest entry point exists', () => {
  const files = [
    manifest.background.service_worker,
    manifest.action.default_popup,
    ...Object.values(manifest.icons),
    ...Object.values(manifest.action.default_icon),
    ...manifest.content_scripts.flatMap(script => [...script.js, ...script.css]),
  ]

  for (const file of files) {
    assert.equal(fs.existsSync(path.join(extensionRoot, file)), true, `${file} is missing`)
  }
})

test('extension icons have the declared dimensions', () => {
  for (const [declaredSize, file] of Object.entries(manifest.icons)) {
    const dimensions = pngSize(path.join(extensionRoot, file))
    const size = Number(declaredSize)
    assert.deepEqual(dimensions, { width: size, height: size })
  }
})

test('extension requests only the permissions it uses', () => {
  assert.deepEqual(manifest.permissions, ['contextMenus', 'storage'])
})

test('content scripts are restricted to normal web pages', () => {
  const matches = manifest.content_scripts.flatMap(script => script.matches)
  assert.deepEqual(matches, ['http://*/*', 'https://*/*'])
})
