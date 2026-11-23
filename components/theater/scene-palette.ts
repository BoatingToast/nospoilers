/** Reads the shared design tokens so the WebGL scenes match the rest of the product. */

type Rgb = [number, number, number]

function readToken(name: string): Rgb {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(`--ns-${name}`).trim()
  const [r = 0, g = 0, b = 0] = raw.split(/\s+/).map(Number)
  return [r, g, b]
}

const css = ([r, g, b]: Rgb) => `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`
const mix = (from: Rgb, to: Rgb, amount: number): Rgb => [
  from[0] + (to[0] - from[0]) * amount,
  from[1] + (to[1] - from[1]) * amount,
  from[2] + (to[2] - from[2]) * amount,
]

export function scenePalette() {
  const bg = readToken('bg')
  const surface = readToken('surface')
  const surface2 = readToken('surface-2')
  const surface3 = readToken('surface-3')
  const border = readToken('border')
  const text = readToken('text')
  const muted = readToken('muted')
  const subtle = readToken('subtle')
  const coral = readToken('secondary')
  const coralText = readToken('secondary-readable')
  const leaf = readToken('tile-green')

  return {
    bg: css(bg),
    surface: css(surface),
    surface2: css(surface2),
    surface3: css(surface3),
    border: css(border),
    text: css(text),
    muted: css(muted),
    subtle: css(subtle),
    coral: css(coral),
    coralText: css(coralText),
    leaf: css(leaf),
    /** Deep coral upholstery for seats and curtains. */
    velvet: css(mix(coral, bg, 0.62)),
    curtain: css(mix(coral, bg, 0.74)),
    runner: css(mix(coral, bg, 0.84)),
    /** Warm, soft practical light that stays inside the charcoal palette. */
    warmLight: css(mix(text, coral, 0.16)),
  }
}

/** Resolves the display face for canvas text, which cannot read Tailwind classes. */
export async function sceneFont() {
  const family = getComputedStyle(document.documentElement).getPropertyValue('--font-bricolage').trim() || 'system-ui'
  try {
    await Promise.race([
      document.fonts.load(`700 64px ${family}`),
      new Promise(resolve => setTimeout(resolve, 600)),
    ])
  } catch {
    // Canvas labels fall back to the next family in the stack.
  }
  return `${family}, system-ui, sans-serif`
}
