import type { Config } from 'tailwindcss'

const displayFont = ['var(--font-bricolage)', 'system-ui', 'sans-serif']
const bodyFont = ['var(--font-jakarta)', 'system-ui', 'sans-serif']

const config: Config = {
  // Hover styles only apply on devices that can really hover, so they never stick after a tap.
  future: { hoverOnlyWhenSupported: true },
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Every value reads from the CSS custom properties defined in
        // app/globals.css — that file is the single source of truth for
        // color. Change the brand there, not here.
        ns: {
          bg:                    'rgb(var(--ns-bg) / <alpha-value>)',
          surface:               'rgb(var(--ns-surface) / <alpha-value>)',
          'surface-2':           'rgb(var(--ns-surface-2) / <alpha-value>)',
          'surface-3':           'rgb(var(--ns-surface-3) / <alpha-value>)',
          border:                'rgb(var(--ns-border) / <alpha-value>)',
          'border-strong':       'rgb(var(--ns-border-strong) / <alpha-value>)',

          primary:               'rgb(var(--ns-primary) / <alpha-value>)',
          'primary-foreground':  'rgb(var(--ns-primary-foreground) / <alpha-value>)',

          secondary:             'rgb(var(--ns-secondary) / <alpha-value>)',
          'secondary-hover':     'rgb(var(--ns-secondary-hover) / <alpha-value>)',
          'secondary-dim':       'rgb(var(--ns-secondary-dim) / <alpha-value>)',
          'secondary-foreground':'rgb(var(--ns-secondary-foreground) / <alpha-value>)',
          'secondary-readable':  'rgb(var(--ns-secondary-readable) / <alpha-value>)',

          text:                  'rgb(var(--ns-text) / <alpha-value>)',
          muted:                 'rgb(var(--ns-muted) / <alpha-value>)',
          subtle:                'rgb(var(--ns-subtle) / <alpha-value>)',

          success:               'rgb(var(--ns-success) / <alpha-value>)',
          danger:                'rgb(var(--ns-danger) / <alpha-value>)',
          warning:               'rgb(var(--ns-warning) / <alpha-value>)',
          info:                  'rgb(var(--ns-info) / <alpha-value>)',

          'tier-epic':           'rgb(var(--ns-tier-epic) / <alpha-value>)',

          // Iris brand spark, used sparingly for dots and counts.
          accent:                'rgb(var(--ns-accent) / <alpha-value>)',

          // Soft tiles for stats and feature blocks. Text on them is ns-text.
          'tile-blue':           'rgb(var(--ns-tile-blue) / <alpha-value>)',
          'tile-yellow':         'rgb(var(--ns-tile-yellow) / <alpha-value>)',
          'tile-peach':          'rgb(var(--ns-tile-peach) / <alpha-value>)',
          'tile-lilac':          'rgb(var(--ns-tile-lilac) / <alpha-value>)',
          'tile-green':          'rgb(var(--ns-tile-green) / <alpha-value>)',
          'tile-rose':           'rgb(var(--ns-tile-rose) / <alpha-value>)',

          'chart-1': 'rgb(var(--ns-chart-1) / <alpha-value>)',
          'chart-2': 'rgb(var(--ns-chart-2) / <alpha-value>)',
          'chart-3': 'rgb(var(--ns-chart-3) / <alpha-value>)',
          'chart-4': 'rgb(var(--ns-chart-4) / <alpha-value>)',
          'chart-5': 'rgb(var(--ns-chart-5) / <alpha-value>)',
          'chart-6': 'rgb(var(--ns-chart-6) / <alpha-value>)',
          'chart-7': 'rgb(var(--ns-chart-7) / <alpha-value>)',
        },
      },
      fontFamily: {
        display: displayFont,
        heading: displayFont,
        body:    bodyFont,
      },
      // Soft, generous corners. Existing rounded-* classes inherit this.
      borderRadius: {
        sm:    '6px',
        DEFAULT: '8px',
        md:    '10px',
        lg:    '12px',
        xl:    '16px',
        '2xl': '24px',
        '3xl': '32px',
      },
      animation: {
        'wipe-reveal': 'wipeReveal 0.7s cubic-bezier(0.77,0,0.175,1) forwards',
        'fade-up':     'fadeUp 0.24s cubic-bezier(0.16,1,0.3,1) forwards',
        'fade-in':     'fadeIn 0.15s ease-out forwards',
        'pulse-slow':  'pulse 3s ease-in-out infinite',
        'bell-ring':   'bellRing 0.6s ease-in-out',
      },
      keyframes: {
        wipeReveal: {
          '0%':   { transform: 'scaleX(1)' },
          '100%': { transform: 'scaleX(0)' },
        },
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        bellRing: {
          '0%':   { transform: 'rotate(0deg)' },
          '15%':  { transform: 'rotate(12deg)' },
          '30%':  { transform: 'rotate(-10deg)' },
          '45%':  { transform: 'rotate(8deg)' },
          '60%':  { transform: 'rotate(-6deg)' },
          '75%':  { transform: 'rotate(4deg)' },
          '90%':  { transform: 'rotate(-2deg)' },
          '100%': { transform: 'rotate(0deg)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}

export default config
