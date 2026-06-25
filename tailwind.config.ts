import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ns: {
          bg:         '#07070F',
          surface:    '#0C0C18',
          'surface-2':'#121220',
          border:     '#1C1C2E',
          gold:       '#C8963E',
          'gold-dim': '#7A5A25',
          text:       '#EDE9E1',
          muted:      '#52506A',
          accent:     '#FF5F42',
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
