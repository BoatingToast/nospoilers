# Chrome Web Store listing — NoSpoilers Shield

## Product details

- **Name:** NoSpoilers Shield
- **Category:** Productivity
- **Language:** English
- **Privacy policy:** https://nospoilers-blush.vercel.app/privacy/extension
- **Recommended initial visibility:** Unlisted (beta), then Public

### Short description

Hide likely movie and TV spoilers across the web until you choose to reveal them.

### Detailed description

Browse freely without having a movie or show ruined by a headline, thumbnail, search result, or social post.

NoSpoilers Shield lets you create a protected list of movies and shows. It checks visible page content locally and covers likely spoilers with a clear shield that you can reveal whenever you are ready.

Features:

- Protect any movie or show title
- Balanced, relaxed, and strict sensitivity modes
- Hide newly loaded posts in dynamic feeds
- Reveal one shield or every shield on the page
- Pause protection on individual websites
- Add a selected title from Chrome's right-click menu
- Sync preferences through Chrome
- No ads, tracking, or NoSpoilers backend account required

Page content is classified on your device and is never uploaded to NoSpoilers.

## Privacy practices

### Single purpose

NoSpoilers Shield locally identifies and hides likely movie and television spoilers for titles selected by the user.

### Permission justifications

- **storage:** Saves protected titles, sensitivity, the enabled state, generic-spoiler preference, and paused domains using Chrome synchronized storage.
- **contextMenus:** Lets the user protect selected text as a title or pause protection on the current website from Chrome's context menu.
- **Host permissions (`http://*/*`, `https://*/*`):** Required for the extension's single purpose: locally inspect visible webpage text and obscure blocks that are likely to spoil a protected title.

### Remote code

No. Every executable file is included in the extension package.

### Data handling disclosure

- **Website content:** Processed temporarily and locally to classify likely spoilers; not stored or transmitted to NoSpoilers.
- **User-provided protected titles and preferences:** Stored with `chrome.storage.sync` so Chrome may synchronize them across the user's signed-in browsers; not transmitted to NoSpoilers.
- **Paused domains:** Stored only when explicitly selected by the user; used solely to disable protection on that domain.
- No data is sold, used for personalized advertising, or shared with third parties by NoSpoilers.

Certify compliance with every applicable Limited Use statement in the dashboard.

## Required uploads

- Store icon: `store-assets/icon-128.png`
- Screenshot: `store-assets/screenshot-1280x800.png`
- Small promo tile: `store-assets/small-promo-440x280.png`
