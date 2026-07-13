importScripts('shared.js')

const MENU_ROOT = 'nospoilers-root'
const MENU_PROTECT = 'nospoilers-protect-selection'
const MENU_PAUSE = 'nospoilers-pause-site'

async function ensureDefaults() {
  const stored = await chrome.storage.sync.get(null)
  await chrome.storage.sync.set(NoSpoilersShared.normalizeSettings(stored))
}

function createMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ROOT,
      title: 'NoSpoilers Shield',
      contexts: ['page', 'selection'],
    })
    chrome.contextMenus.create({
      id: MENU_PROTECT,
      parentId: MENU_ROOT,
      title: 'Protect “%s”',
      contexts: ['selection'],
    })
    chrome.contextMenus.create({
      id: MENU_PAUSE,
      parentId: MENU_ROOT,
      title: 'Pause protection on this site',
      contexts: ['page'],
    })
  })
}

chrome.runtime.onInstalled.addListener(() => {
  void ensureDefaults()
  createMenus()
  chrome.action.setBadgeBackgroundColor({ color: '#7c3aed' })
})

chrome.runtime.onStartup.addListener(() => {
  void ensureDefaults()
  createMenus()
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === MENU_PROTECT && info.selectionText) {
    void NoSpoilersShared.getSettings().then(settings => {
      const title = NoSpoilersShared.cleanTitle(info.selectionText)
      if (!title) return
      return NoSpoilersShared.saveSettings({
        protectedTitles: [...settings.protectedTitles, title],
      })
    })
  }

  if (info.menuItemId === MENU_PAUSE && tab?.url) {
    void NoSpoilersShared.getSettings().then(settings => {
      let domain = ''
      try {
        domain = NoSpoilersShared.cleanDomain(new URL(tab.url).hostname)
      } catch {
        return
      }
      if (!domain) return
      return NoSpoilersShared.saveSettings({
        pausedDomains: [...settings.pausedDomains, domain],
      })
    })
  }
})

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== 'NS_BLOCK_COUNT' || !sender.tab?.id) return
  const count = Math.max(0, Number(message.count) || 0)
  chrome.action.setBadgeText({
    tabId: sender.tab.id,
    text: count > 0 ? String(Math.min(count, 99)) : '',
  })
  chrome.action.setBadgeBackgroundColor({ tabId: sender.tab.id, color: '#7c3aed' })
})
