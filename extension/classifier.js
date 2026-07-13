(function initializeClassifier(root) {
  'use strict'

  const BALANCED_PATTERNS = [
    /\b(?:dies?|dead|death|killed?|murders?|murdered|survives?|betrays?|traitor)\b/i,
    /\b(?:ending|finale|final scene|last scene|post[ -]?credits?|mid[ -]?credits?)\b/i,
    /\b(?:plot twist|twist ending|ending explained|big reveal|secret identity)\b/i,
    /\b(?:the (?:killer|villain|traitor) is|turns out (?:to be|that)|is revealed as)\b/i,
    /\b(?:spoilers?|leaked?|leaks?|recap|breakdown|explained)\b/i,
    /\bwho (?:dies|survives|wins|is the killer)\b/i,
  ]

  const HIGH_CONFIDENCE_PATTERNS = [
    /\b(?:ending|finale|plot twist|twist ending|ending explained)\b/i,
    /\b(?:the (?:killer|villain|traitor) is|secret identity|is revealed as)\b/i,
    /\b(?:spoiler alert|major spoilers?|leaked ending|who dies|who survives)\b/i,
  ]

  function normalizeText(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim()
  }

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  function titlePattern(title) {
    const escaped = escapeRegExp(title)
    return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?:$|[^\\p{L}\\p{N}])`, 'iu')
  }

  function matchingTitle(text, titles) {
    const sorted = [...(titles ?? [])]
      .map(title => normalizeText(title))
      .filter(title => title.length >= 2)
      .sort((a, b) => b.length - a.length)
    return sorted.find(title => titlePattern(title).test(text)) ?? null
  }

  function matchingPattern(text, patterns) {
    return patterns.find(pattern => pattern.test(text)) ?? null
  }

  /**
   * Classify one self-contained page block. The balanced default requires both
   * a protected title and spoiler-like language, which avoids hiding ordinary
   * navigation and harmless recommendations.
   */
  function classifyText(rawText, rawSettings) {
    const text = normalizeText(rawText).slice(0, 8000)
    const settings = {
      sensitivity: rawSettings?.sensitivity ?? 'balanced',
      protectedTitles: Array.isArray(rawSettings?.protectedTitles)
        ? rawSettings.protectedTitles
        : [],
      blockGenericSpoilers: rawSettings?.blockGenericSpoilers === true,
    }

    if (!text) return { blocked: false, title: null, reason: null }

    const title = matchingTitle(text, settings.protectedTitles)
    const balancedMatch = matchingPattern(text, BALANCED_PATTERNS)
    const strongMatch = matchingPattern(text, HIGH_CONFIDENCE_PATTERNS)

    if (title && settings.sensitivity === 'strict') {
      return { blocked: true, title, reason: 'protected-title' }
    }
    if (title && settings.sensitivity === 'relaxed' && strongMatch) {
      return { blocked: true, title, reason: 'high-confidence-spoiler' }
    }
    if (title && settings.sensitivity !== 'relaxed' && balancedMatch) {
      return { blocked: true, title, reason: 'likely-spoiler' }
    }
    if (settings.blockGenericSpoilers && strongMatch) {
      return { blocked: true, title: null, reason: 'generic-spoiler' }
    }

    return { blocked: false, title: null, reason: null }
  }

  const api = {
    BALANCED_PATTERNS,
    HIGH_CONFIDENCE_PATTERNS,
    classifyText,
    matchingTitle,
    normalizeText,
  }

  root.NoSpoilersClassifier = api
  if (typeof module !== 'undefined' && module.exports) module.exports = api
})(typeof globalThis !== 'undefined' ? globalThis : this)
