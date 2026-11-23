# NoSpoilers design system

NoSpoilers is a dark, cinematic product with friendly confidence: near-black pages, big tight headlines, rounded charcoal panels, iris actions, and movie posters supplying the color. Its signature is the **redaction bar**. Story details sit under an iris bar, and the bar wipes away when the viewer chooses to look. The interface should feel alive because it demonstrates that idea, not because things float around.

## Color

Use `ns-*` tokens only. Never use raw hex values or Tailwind palette colors in components. Values live in `app/globals.css`.

| Token | Use |
|---|---|
| `ns-bg` | Page canvas and recessed inputs |
| `ns-surface` | Cards, large panels, modals |
| `ns-surface-2` | Menus, chips, tracks, hover on surface |
| `ns-surface-3` | Hover or selected state on `surface-2` |
| `ns-border` | Hairline dividers |
| `ns-border-strong` | Outlines of form controls (3:1) |
| `ns-text` | Primary copy, headings, icons |
| `ns-muted` | Secondary copy |
| `ns-subtle` | Placeholder and tertiary metadata |
| `ns-secondary` + `ns-secondary-foreground` | Iris primary action with off-white text. Hover uses `ns-secondary-hover` |
| `ns-secondary-readable` | Iris text and icons on dark surfaces |
| `ns-accent` | Iris spark for dots and count badges. Text on it is `ns-secondary-foreground` |
| `ns-tile-blue`, `-yellow`, `-peach`, `-lilac`, `-green`, `-rose` | Deep tinted tiles for stats and feature blocks. Text on them is `ns-text` or `ns-muted` |
| `ns-success`, `ns-danger`, `ns-warning`, `ns-info` | Status only, always paired with text or an icon |
| `ns-chart-1` to `ns-chart-7` | Categorical data only |

Rules:

- Do not put opacity on text colors. Use `ns-muted` or `ns-subtle`.
- Status tints use `/10`, such as `bg-ns-danger/10 text-ns-danger`. Text on a solid status fill is `text-ns-bg`.
- Text over images or video is `text-white` on a dark scrim such as `bg-gradient-to-t from-black/80 to-transparent`.
- Most of a screen is charcoal and off-white. One iris primary action per view. Tiles add warmth to stats. Do not use every color at once.

## Type

| Class | Family | Use |
|---|---|---|
| `font-display` | Bricolage Grotesque, bold, tight | Page titles and major section titles |
| `font-heading` | Bricolage Grotesque | Card, list, and subsection titles. Add `font-bold` or `font-semibold` |
| `font-body` | Plus Jakarta Sans | Everything else. This is the default |

- Headlines are sentence case and may end in a period: "Your watchlist." Never all caps.
- Scale: `text-xs` (12px, the minimum), `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`, then display sizes. Page titles are `text-4xl sm:text-5xl`.
- Body copy is `text-base` or `text-lg` in `ns-muted`. Inputs are `text-base`.
- Limit reading width with `max-w-xl` to `max-w-2xl`.
- No uppercase tracked eyebrows and no `tracking-*` classes.
- Numbers in stats and tables use `tabular-nums`.

## Shape, space, and depth

- Radius: `rounded-full` for buttons, chips, tabs, and avatars. `rounded-xl` (16px) for posters, inputs, and tiles. `rounded-2xl` (24px) for cards and modals. `rounded-3xl` (32px) for large page panels.
- Be generous. Sections use `py-10 lg:py-16`, panels use `p-7 sm:p-10 lg:p-14`, cards use `p-6`.
- Page padding is `px-4 sm:px-6`, content width is `max-w-7xl`, reading pages use `max-w-3xl`.
- Separate with panels, whitespace, and `divide-y divide-ns-border`. Avoid outlined boxes.
- Depth comes from lighter surfaces. Shadows are only for floating layers such as menus, modals, and product previews.
- Do not nest same-colored cards. Use the next surface step inside a card.
- Prefer rows, lists, and tables to grids of identical icon cards.

## Motion

Motion is part of the brand, and every animation needs a job: feedback, continuity, state, explanation, or one earned moment of delight. Frequency decides how much motion something gets. Keyboard shortcuts and actions used all day get none, occasional overlays get standard motion, and first-run or marketing moments get the expressive treatment. The shared classes are in `globals.css`, need no dependencies, are safe in Server Components, and respect reduced motion automatically.

| Class | Effect | Use |
|---|---|---|
| `ns-reveal` | Below-the-fold content fades and rises once. Content already on screen never waits. Set `style={{ '--i': n }}` for a 40ms stagger, capped at 240ms | Groups below the fold. Not every section, and never parent and children together |
| `ns-backdrop-in`, `ns-dialog-in`, `ns-pop-in`, `ns-drawer-in` | Overlay entrances, from scale 0.95 or more, never 0 | Backdrops, dialogs, menus with a `origin-*` at their trigger, drawers |
| `ns-word` | Word resolves in with a 4px blur. Set `--i` per word | Landing-style hero headlines only |
| `ns-rise` | Rises in after the headline. Set `--i` | Content directly under a hero headline |
| `ns-unredact` | Word starts under an iris bar and uncovers on load | One key word in a hero |
| `ns-redact` | Redaction bar. `data-open="true"` wipes it away | All hidden story text, with a screen-reader alternative |
| `ns-scroll-expand` | Opens up as it scrolls into view | One large preview, stat panel, or media block per page |
| `ns-marquee` + `ns-marquee-track` | Endless slow row, pauses on hover | Decorative poster or logo rows. Render items twice, mark `aria-hidden` |
| `ns-progress` | Timer bar for self-playing demos | Auto-advancing content |

Rules:

- Put `ns-reveal` on a wrapper, never on a button, a modal, or anything containing a `fixed` element.
- Do not put `ns-reveal` on the `h1` or the first content on a page. Primary content must appear immediately.
- Animate only `transform`, `opacity`, `clip-path`, and `background-size`.
- Use `--ns-ease-snap` for interface responses: 100 to 160ms for presses, 150 to 250ms for menus, 200 to 300ms for modals. Use `--ns-ease-out` only for drawers and authored entrances, 360 to 620ms. Never use `ease-in` or bounce on UI.
- Exits are faster than entrances. Never use `transition-all`. Transition named properties only.
- Rapidly toggled UI uses transitions rather than keyframes, so it can be interrupted.
- State changes should communicate: values update, progress grows, hidden text wipes open. Numbers people are reading do not move for style, and tabs do not slide or crossfade.
- Hover on posters zooms the image inside its frame. Hover on controls changes color. Cards do not lift or glow. Hover only applies on devices that can hover, and never gates a function.
- Anything that loops or auto-advances for more than 5 seconds needs a visible pause control and must stop when off-screen. Never auto-advance content the viewer is reading.
- Never use motion that reveals spoiler content without a deliberate viewer action.

## Components

Use the shared components in `components/ui` before writing markup:

`Button`, `Card`, `Panel`, `Badge`, `Input`, `Modal`, `MovieCard`, `Skeleton`, `PageHeader`, `EmptyState`, `Logo`.

- Every route opens with `PageHeader` or a purposeful hero, and has exactly one `h1`.
- One `Button variant="primary"` per view. Other actions are `secondary`, `outline`, or `ghost`.
- Tabs and filters are pills: selected is `bg-ns-text text-ns-bg`, unselected is `text-ns-muted hover:bg-ns-surface-2`.
- Interactive targets are at least 40px tall on desktop and 44px on touch. Icon-only controls need an `aria-label`.
- Forms have visible labels and inline errors with `aria-describedby`.
- Empty states say what is missing and offer the next action. Loading states match the final layout.
- Posters keep a `2/3` aspect ratio. Horizontal poster rows are the one allowed horizontal scroll and must remain keyboard reachable.

## Never use

Light page backgrounds, all-caps headings, small labels above headings (eyebrows), purple or blue gradients, gradient text, glow shadows, glassmorphism, background blur on panels, decorative orbs, grids, scanlines, noise, emoji as icons, numbered section labels, one-sided accent stripes on cards, nested cards, pulsing status dots, text below 12px, low-opacity text, floating or orbiting decoration, hover lift effects, invented stats or testimonials, and filler marketing words. `.ns-hero-glow` is reserved for the landing hero and 404. Marquees and self-playing demos are reserved for marketing surfaces and must pause on request and off-screen.

## Copy

Buttons name the action and its object. Errors say what failed and how to recover. Empty states distinguish first use, no results, and failure. Loading text names the real operation. Say each idea once.
