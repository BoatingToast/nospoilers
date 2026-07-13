(function startNoSpoilersShield() {
  'use strict'

  const CANDIDATE_SELECTOR = [
    'article',
    '[role="article"]',
    '[data-testid="tweet"]',
    'ytd-rich-item-renderer',
    'ytd-video-renderer',
    'ytd-compact-video-renderer',
    'shreddit-post',
    '.thing.link',
    '.g',
    'li',
    'h1',
    'h2',
    'h3',
    'h4',
    'p',
  ].join(',')

  const EXCLUDED_SELECTOR = [
    'script',
    'style',
    'noscript',
    'textarea',
    'input',
    'select',
    'option',
    '[contenteditable="true"]',
    '.ns-spoiler-shield',
  ].join(',')

  let settings = { ...NoSpoilersShared.DEFAULT_SETTINGS }
  let processed = new WeakSet()
  let protectionActive = false
  let drainScheduled = false
  const candidateQueue = new Set()
  const blockedElements = new Set()

  function currentHostname() {
    return NoSpoilersShared.cleanDomain(window.location.hostname)
  }

  function shouldProtect() {
    return settings.enabled &&
      (settings.protectedTitles.length > 0 || settings.blockGenericSpoilers) &&
      !NoSpoilersShared.isDomainPaused(currentHostname(), settings.pausedDomains)
  }

  function collectText(element) {
    const parts = [element.innerText || element.textContent || '']
    const described = element.querySelectorAll('[aria-label], [title], img[alt]')
    for (const node of Array.from(described).slice(0, 16)) {
      parts.push(
        node.getAttribute('aria-label') ||
        node.getAttribute('title') ||
        node.getAttribute('alt') ||
        '',
      )
    }
    return parts.join(' ').replace(/\s+/g, ' ').trim()
  }

  function isUsableCandidate(element) {
    if (!(element instanceof HTMLElement)) return false
    if (element.matches(EXCLUDED_SELECTOR) || element.closest(EXCLUDED_SELECTOR)) return false
    if (element.classList.contains('ns-spoiler-block')) return false
    if (element.closest('.ns-spoiler-block')) return false
    if (element.closest('#nospoilers-extension-root')) return false
    return true
  }

  function reportCount() {
    for (const element of blockedElements) {
      if (!element.isConnected) blockedElements.delete(element)
    }
    chrome.runtime.sendMessage({
      type: 'NS_BLOCK_COUNT',
      count: blockedElements.size,
    }).catch(() => {})
  }

  function revealElement(element, shouldReport = true) {
    element.querySelector(':scope > .ns-spoiler-shield')?.remove()
    element.classList.remove('ns-spoiler-block')
    element.removeAttribute('data-ns-spoiler-title')
    blockedElements.delete(element)
    if (shouldReport) reportCount()
  }

  function hideElement(element, result) {
    if (element.classList.contains('ns-spoiler-block')) return

    const shield = document.createElement('button')
    shield.type = 'button'
    shield.className = 'ns-spoiler-shield'
    shield.setAttribute('aria-label', 'Reveal hidden spoiler content')

    const mark = document.createElement('span')
    mark.className = 'ns-spoiler-mark'
    mark.textContent = 'NS'

    const copy = document.createElement('span')
    copy.className = 'ns-spoiler-copy'

    const label = document.createElement('strong')
    label.textContent = result.title
      ? `Potential ${result.title} spoiler hidden`
      : 'Potential spoiler hidden'

    const hint = document.createElement('small')
    hint.textContent = 'Click to reveal'

    copy.append(label, hint)
    shield.append(mark, copy)
    shield.addEventListener('click', event => {
      event.preventDefault()
      event.stopPropagation()
      revealElement(element)
    })

    element.classList.add('ns-spoiler-block')
    if (result.title) element.dataset.nsSpoilerTitle = result.title
    element.append(shield)
    blockedElements.add(element)
    reportCount()
  }

  function inspectCandidate(element) {
    if (!protectionActive || processed.has(element)) return
    processed.add(element)
    if (!isUsableCandidate(element)) return

    const text = collectText(element)
    if (text.length < 3 || text.length > 8000) return

    const result = NoSpoilersClassifier.classifyText(text, settings)
    if (result.blocked) hideElement(element, result)
  }

  function scheduleDrain() {
    if (drainScheduled) return
    drainScheduled = true

    const run = deadline => {
      drainScheduled = false
      let inspected = 0
      while (candidateQueue.size > 0 && (inspected < 60 || deadline.timeRemaining() > 2)) {
        const element = candidateQueue.values().next().value
        candidateQueue.delete(element)
        inspectCandidate(element)
        inspected += 1
        if (inspected >= 240) break
      }
      if (candidateQueue.size > 0) scheduleDrain()
    }

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(run, { timeout: 500 })
    } else {
      window.setTimeout(() => run({ timeRemaining: () => 8 }), 40)
    }
  }

  function queueCandidate(element) {
    if (!(element instanceof HTMLElement) || processed.has(element)) return
    candidateQueue.add(element)
    scheduleDrain()
  }

  function scanRoot(root) {
    if (!protectionActive || !root) return
    if (root instanceof HTMLElement && root.matches(CANDIDATE_SELECTOR)) {
      queueCandidate(root)
    }
    if ('querySelectorAll' in root) {
      for (const element of root.querySelectorAll(CANDIDATE_SELECTOR)) {
        queueCandidate(element)
      }
    }
  }

  function revealAll() {
    for (const element of [...blockedElements]) revealElement(element, false)
    reportCount()
  }

  function resetPage() {
    revealAll()
    processed = new WeakSet()
    candidateQueue.clear()
  }

  async function refreshSettings() {
    settings = await NoSpoilersShared.getSettings()
    protectionActive = shouldProtect()
    resetPage()
    if (protectionActive) scanRoot(document)
    reportCount()
  }

  const observer = new MutationObserver(mutations => {
    if (!protectionActive) return
    for (const mutation of mutations) {
      if (mutation.type === 'characterData') {
        const parent = mutation.target.parentElement
        if (parent) {
          const candidate = parent.closest(CANDIDATE_SELECTOR) ?? parent
          processed.delete(candidate)
          queueCandidate(candidate)
        }
      }
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLElement) {
          const parentCandidate = node.parentElement?.closest(CANDIDATE_SELECTOR)
          if (parentCandidate) {
            processed.delete(parentCandidate)
            queueCandidate(parentCandidate)
          }
          scanRoot(node)
        }
      }
    }
  })

  observer.observe(document.documentElement, {
    childList: true,
    characterData: true,
    subtree: true,
  })

  chrome.storage.onChanged.addListener((_changes, areaName) => {
    if (areaName === 'sync') void refreshSettings()
  })

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'NS_GET_STATUS') {
      sendResponse({
        blockedCount: blockedElements.size,
        enabled: protectionActive,
        hostname: currentHostname(),
        paused: NoSpoilersShared.isDomainPaused(currentHostname(), settings.pausedDomains),
      })
      return
    }
    if (message?.type === 'NS_REVEAL_ALL') {
      revealAll()
      sendResponse({ ok: true })
      return
    }
    if (message?.type === 'NS_REFRESH') {
      void refreshSettings().then(() => sendResponse({ ok: true }))
      return true
    }
  })

  void refreshSettings()
})()
