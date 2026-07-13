const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const extensionRoot = path.resolve(__dirname, '..')
const manifest = JSON.parse(fs.readFileSync(path.join(extensionRoot, 'manifest.json'), 'utf8'))

test('extension uses Manifest V3', () => {
  assert.equal(manifest.manifest_version, 3)
  assert.equal(manifest.background.service_worker, 'background.js')
})

test('every manifest entry point exists', () => {
  const files = [
    manifest.background.service_worker,
    manifest.action.default_popup,
    ...manifest.content_scripts.flatMap(script => [...script.js, ...script.css]),
  ]

  for (const file of files) {
    assert.equal(fs.existsSync(path.join(extensionRoot, file)), true, `${file} is missing`)
  }
})

test('content scripts are restricted to normal web pages', () => {
  const matches = manifest.content_scripts.flatMap(script => script.matches)
  assert.deepEqual(matches, ['http://*/*', 'https://*/*'])
})
