(function initializePopup() {
  'use strict'

  const elements = {
    enabled: document.querySelector('#enabled'),
    sensitivity: document.querySelector('#sensitivity'),
    genericSpoilers: document.querySelector('#genericSpoilers'),
    titleForm: document.querySelector('#titleForm'),
    titleInput: document.querySelector('#titleInput'),
    titleList: document.querySelector('#titleList'),
    titleCount: document.querySelector('#titleCount'),
    emptyState: document.querySelector('#emptyState'),
    siteLabel: document.querySelector('#siteLabel'),
    blockStatus: document.querySelector('#blockStatus'),
    statusDot: document.querySelector('#statusDot'),
    pauseSite: document.querySelector('#pauseSite'),
    revealAll: document.querySelector('#revealAll'),
    openPassport: document.querySelector('#openPassport'),
  }

  let settings = { ...NoSpoilersShared.DEFAULT_SETTINGS }
  let activeTab = null
  let activeDomain = ''
  let pageStatus = { blockedCount: 0, enabled: false, paused: false }

  async function getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    return tab ?? null
  }

  async function sendToPage(message) {
    if (!activeTab?.id || !activeTab.url?.startsWith('http')) return null
    try {
      return await chrome.tabs.sendMessage(activeTab.id, message)
    } catch {
      return null
    }
  }

  function renderTitles() {
    elements.titleList.replaceChildren()
    const effectiveTitles = NoSpoilersShared.effectiveProtectedTitles(settings)
    const passportKeys = new Set(settings.passportTitles.map(title => title.toLocaleLowerCase()))
    elements.titleCount.textContent = String(effectiveTitles.length)
    elements.emptyState.hidden = effectiveTitles.length > 0

    for (const title of effectiveTitles) {
      const item = document.createElement('li')
      item.className = 'title-chip'

      const label = document.createElement('span')
      label.textContent = title

      const remove = document.createElement('button')
      remove.type = 'button'
      const fromPassport = passportKeys.has(title.toLocaleLowerCase())
      remove.textContent = fromPassport ? 'PP' : '×'
      remove.disabled = fromPassport
      remove.title = fromPassport ? 'Managed by Plot Passport' : `Stop protecting ${title}`
      remove.setAttribute('aria-label', fromPassport ? `${title} is managed by Plot Passport` : `Stop protecting ${title}`)
      if (!fromPassport) {
        remove.addEventListener('click', () => {
          void updateSettings({
            protectedTitles: settings.protectedTitles.filter(value => value !== title),
          })
        })
      }

      item.append(label, remove)
      elements.titleList.append(item)
    }
  }

  function renderSiteStatus() {
    const globallyOff = !settings.enabled
    const paused = activeDomain && NoSpoilersShared.isDomainPaused(
      activeDomain,
      settings.pausedDomains,
    )
    const count = pageStatus.blockedCount ?? 0

    elements.siteLabel.textContent = activeDomain || 'This Chrome page'
    elements.statusDot.className = 'status-dot'

    if (globallyOff) {
      elements.blockStatus.textContent = 'Protection is turned off'
    } else if (paused) {
      elements.statusDot.classList.add('paused')
      elements.blockStatus.textContent = 'Protection paused on this site'
    } else if (NoSpoilersShared.effectiveProtectedTitles(settings).length === 0 && !settings.blockGenericSpoilers) {
      elements.blockStatus.textContent = 'Add a title to start protection'
    } else {
      elements.statusDot.classList.add('active')
      elements.blockStatus.textContent = count === 0
        ? 'Page protected · nothing hidden'
        : `${count} potential spoiler${count === 1 ? '' : 's'} hidden`
    }

    elements.pauseSite.disabled = !activeDomain
    elements.pauseSite.textContent = paused ? 'Resume on this site' : 'Pause on this site'
    elements.revealAll.disabled = count === 0
  }

  function render() {
    elements.enabled.checked = settings.enabled
    elements.sensitivity.value = settings.sensitivity
    elements.genericSpoilers.checked = settings.blockGenericSpoilers
    renderTitles()
    renderSiteStatus()
  }

  async function refreshPageStatus() {
    pageStatus = await sendToPage({ type: 'NS_GET_STATUS' }) ?? {
      blockedCount: 0,
      enabled: false,
      paused: false,
    }
    renderSiteStatus()
  }

  async function updateSettings(patch) {
    settings = await NoSpoilersShared.saveSettings(patch)
    render()
    window.setTimeout(() => void refreshPageStatus(), 120)
  }

  elements.titleForm.addEventListener('submit', event => {
    event.preventDefault()
    const title = NoSpoilersShared.cleanTitle(elements.titleInput.value)
    if (!title) return
    elements.titleInput.value = ''
    void updateSettings({ protectedTitles: [...settings.protectedTitles, title] })
  })

  elements.enabled.addEventListener('change', () => {
    void updateSettings({ enabled: elements.enabled.checked })
  })

  elements.sensitivity.addEventListener('change', () => {
    void updateSettings({ sensitivity: elements.sensitivity.value })
  })

  elements.genericSpoilers.addEventListener('change', () => {
    void updateSettings({ blockGenericSpoilers: elements.genericSpoilers.checked })
  })

  elements.pauseSite.addEventListener('click', () => {
    if (!activeDomain) return
    const paused = NoSpoilersShared.isDomainPaused(activeDomain, settings.pausedDomains)
    const nextDomains = paused
      ? settings.pausedDomains.filter(domain => !NoSpoilersShared.isDomainPaused(activeDomain, [domain]))
      : [...settings.pausedDomains, activeDomain]
    void updateSettings({ pausedDomains: nextDomains })
  })

  elements.revealAll.addEventListener('click', async () => {
    await sendToPage({ type: 'NS_REVEAL_ALL' })
    await refreshPageStatus()
  })

  elements.openPassport.addEventListener('click', () => {
    void chrome.tabs.create({ url: 'https://nospoilers-blush.vercel.app/plot-passport' })
  })

  async function init() {
    const [storedSettings, tab] = await Promise.all([
      NoSpoilersShared.getSettings(),
      getActiveTab(),
    ])
    settings = storedSettings
    activeTab = tab
    if (tab?.url?.startsWith('http')) {
      try {
        activeDomain = NoSpoilersShared.cleanDomain(new URL(tab.url).hostname)
      } catch {
        activeDomain = ''
      }
    }
    render()
    await refreshPageStatus()
  }

  void init()
})()
