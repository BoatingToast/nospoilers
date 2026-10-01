import type { Config } from 'tailwindcss'

const config: Config = {
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
          border:                'rgb(var(--ns-border) / <alpha-value>)',

          primary:               'rgb(var(--ns-primary) / <alpha-value>)',
          'primary-foreground':  'rgb(var(--ns-primary-foreground) / <alpha-value>)',

          secondary:             'rgb(var(--ns-secondary) / <alpha-value>)',
          'secondary-dim':       'rgb(var(--ns-secondary-dim) / <alpha-value>)',
          'secondary-foreground':'rgb(var(--ns-secondary-foreground) / <alpha-value>)',
          'secondary-readable':  'rgb(var(--ns-secondary-readable) / <alpha-value>)',

          text:                  'rgb(var(--ns-text) / <alpha-value>)',
          muted:                 'rgb(var(--ns-muted) / <alpha-value>)',

          success:               'rgb(var(--ns-success) / <alpha-value>)',
          danger:                'rgb(var(--ns-danger) / <alpha-value>)',
          warning:               'rgb(var(--ns-warning) / <alpha-value>)',
          info:                  'rgb(var(--ns-info) / <alpha-value>)',

          'tier-epic':           'rgb(var(--ns-tier-epic) / <alpha-value>)',

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
        display: ['var(--font-bebas)', 'Impact', 'sans-serif'],
        body:    ['var(--font-inter)', 'system-ui', 'sans-serif'],
        heading: ['var(--font-space)', 'system-ui', 'sans-serif'],
      },
      animation: {
        'wipe-reveal': 'wipeReveal 0.9s cubic-bezier(0.77,0,0.175,1) forwards',
        'fade-up':     'fadeUp 0.6s ease forwards',
        'fade-in':     'fadeIn 0.4s ease forwards',
        'pulse-slow':  'pulse 3s ease-in-out infinite',
        'bell-ring':   'bellRing 0.6s ease-in-out',
      },
      keyframes: {
        wipeReveal: {
          '0%':   { transform: 'scaleX(1)' },
          '100%': { transform: 'scaleX(0)' },
        },
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(24px)' },
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
