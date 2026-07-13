# NoSpoilers Shield for Chrome

A standalone Manifest V3 extension that hides likely movie and television
spoilers across websites until the user explicitly reveals them.

## Install locally

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select this `extension` directory.
5. Pin **NoSpoilers Shield** from Chrome's extensions menu.

The extension has no build step. After changing a file, click the extension's
reload button on `chrome://extensions` and refresh the page being tested.

## How it works

- Add movie or show names from the popup, or select a title on any page and use
  **NoSpoilers Shield → Protect** in the context menu.
- Balanced mode hides a page block only when it contains both a protected title
  and spoiler-like language.
- Relaxed mode requires a high-confidence phrase such as “ending explained.”
- Strict mode hides every block that mentions a protected title.
- Protection can be paused per domain, and every shield can be revealed without
  changing the protected list.
- Dynamic feeds are monitored with a batched `MutationObserver`, so newly loaded
  Reddit, YouTube, search, and social posts are checked without rescanning the
  whole page after each update.

Settings use `chrome.storage.sync`, so Chrome can sync them between the user's
signed-in browsers. Page text is classified locally and is never uploaded.

## Files

- `manifest.json` — Manifest V3 entry point and permissions
- `classifier.js` — pure title/spoiler classification logic
- `content.js` / `content.css` — page scanning, shielding, and reveal behavior
- `popup.html` / `popup.css` / `popup.js` — extension controls
- `background.js` — context menus and per-tab badge counts
- `shared.js` — normalized settings and domain handling

## Test

From the repository root:

```bash
npm run test:extension
```

## Current scope

This first version intentionally uses a user-managed protected list. It does not
yet sign in to the NoSpoilers web app or pull the account watchlist. That can be
added later through a narrow extension-sync API without changing the on-page
classifier.
