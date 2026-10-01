# NoSpoilers layout language

The landing hero (`components/landing/Hero.tsx`) is the reference. Every screen
should read as the same publication.

## Rules

1. **Open with `PageHeader`** (`components/ui/PageHeader.tsx`): a large
   left-aligned Bebas title, optionally a second accent line, and a narrower
   right column under a heavy rule holding one plain sentence and the page's
   main actions. Never centre a page title.
2. **Sections are ruled, not boxed.** Use `Section` (`components/ui/Section.tsx`):
   heavy top rule, display heading, optional text link on the right. Do not wrap
   a whole section in a bordered, filled card.
3. **Asymmetric grids.** Prefer `lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]`
   (main plus aside) over equal halves or four equal cards. Lists are rows
   separated by `border-t border-ns-border`, not grids of cards.
4. **Cards only for a single object** that is itself clickable (a film, a
   person, a collection). Use `Card`. No glows, no gradients, no shadows.
5. **No stacked uppercase eyebrow above a heading.** Delete it, or fold its
   meaning into the `note` sentence. Small uppercase labels are fine on data
   (table headers, stat labels), one per group at most.
6. **No decoration that carries no information**: remove glow blobs, radial
   gradients, orbit rings, grain overlays, pulsing dots, icon-in-a-tinted-square
   tiles, "scroll" indicators, and entrance animations.
7. **Buttons**: `Button` from `components/ui`. One `primary` per view; other
   actions are `secondary`, `outline`, or a plain underlined text link.
8. **Pills**: replace `rounded-full` chips with `Badge`, or plain text separated
   by a middle dot. `rounded-full` stays for avatars and switches.
9. **Color**: tokens only (`ns-*` classes). Do not introduce literal colors and
   do not change `app/globals.css` or `tailwind.config.ts`.
10. **Mobile**: one column, 16px gutters, no horizontal scroll, tap targets at
    least 40px tall.

## Do not change

- Behaviour, data fetching, routes, props, or state logic.
- Visible strings, `aria-label`s, roles, and heading text that tests depend on.
  Check `e2e/*.spec.ts` for any text on the screen you are editing before
  rewording it. When in doubt, keep the words and change only the structure.
- Files outside your assigned area.
