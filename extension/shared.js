(function initializeShared(root) {
  'use strict'

  const DEFAULT_SETTINGS = Object.freeze({
    enabled: true,
    sensitivity: 'balanced',
    protectedTitles: [],
    pausedDomains: [],
    blockGenericSpoilers: false,
  })

  const VALID_SENSITIVITIES = new Set(['relaxed', 'balanced', 'strict'])

  function cleanTitle(value) {
    return String(value ?? '')
      .replace(/[\u201c\u201d"']/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120)
  }

  function uniqueStrings(values, cleaner) {
    const seen = new Set()
    const output = []
    for (const raw of Array.isArray(values) ? values : []) {
      const value = cleaner(raw)
      const key = value.toLocaleLowerCase()
      if (!value || seen.has(key)) continue
      seen.add(key)
      output.push(value)
    }
    return output
  }

  function cleanDomain(value) {
    return String(value ?? '')
      .toLocaleLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0]
      .trim()
  }

  function normalizeSettings(value) {
    const settings = value && typeof value === 'object' ? value : {}
    return {
      enabled: settings.enabled !== false,
      sensitivity: VALID_SENSITIVITIES.has(settings.sensitivity)
        ? settings.sensitivity
        : DEFAULT_SETTINGS.sensitivity,
      protectedTitles: uniqueStrings(settings.protectedTitles, cleanTitle),
      pausedDomains: uniqueStrings(settings.pausedDomains, cleanDomain),
      blockGenericSpoilers: settings.blockGenericSpoilers === true,
    }
  }

  function isDomainPaused(hostname, pausedDomains) {
    const host = cleanDomain(hostname)
    return (pausedDomains ?? []).some(raw => {
      const domain = cleanDomain(raw)
      return domain && (host === domain || host.endsWith(`.${domain}`))
    })
  }

  async function getSettings() {
    if (!root.chrome?.storage?.sync) return { ...DEFAULT_SETTINGS }
    const stored = await root.chrome.storage.sync.get(DEFAULT_SETTINGS)
    return normalizeSettings(stored)
  }

  async function saveSettings(patch) {
    const current = await getSettings()
    const next = normalizeSettings({ ...current, ...patch })
    await root.chrome.storage.sync.set(next)
    return next
  }

  const api = {
    DEFAULT_SETTINGS,
    cleanDomain,
    cleanTitle,
    getSettings,
    isDomainPaused,
    normalizeSettings,
    saveSettings,
  }

  root.NoSpoilersShared = api
  if (typeof module !== 'undefined' && module.exports) module.exports = api
})(typeof globalThis !== 'undefined' ? globalThis : this)
