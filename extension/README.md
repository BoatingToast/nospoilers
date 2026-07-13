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
- A signed-in user can open **Plot Passport** on NoSpoilers and send every
  unfinished title to the shield with one click. Passport titles remain separate
  from manually protected titles, so syncing never deletes the user's own list.

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

## Chrome Web Store release

From the repository root, build the upload-ready ZIP:

```bash
npm run package:extension
```

Upload `dist/nospoilers-shield-latest.zip` in the Chrome Web Store Developer
Dashboard. The command validates Manifest V3, runtime files, icon dimensions,
and required store artwork before packaging. It keeps tests, source artwork,
and listing notes out of the extension ZIP, with `manifest.json` at its root.

Use these supporting files when completing the listing:

- `store-listing.md` — descriptions, permission justifications, and privacy answers
- `store-assets/icon-128.png` — store icon
- `store-assets/screenshot-1280x800.png` — product screenshot
- `store-assets/small-promo-440x280.png` — small promotional tile
- `https://nospoilers-blush.vercel.app/privacy/extension` — public privacy policy

Before every update, increment `version` in `manifest.json`, rerun the tests,
and create a fresh package. The privacy URL will become public after the website
changes containing that route are deployed.

## Plot Passport handoff

The extension does not store NoSpoilers credentials or call a private account
API. On the trusted NoSpoilers Plot Passport page, the signed-in web app sends
only the user&apos;s unfinished title names to the installed content script. The
extension validates the origin and stores those names in Chrome sync separately
from its manual list.
