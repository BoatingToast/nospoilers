import type { CSSProperties } from 'react'

const paths = {
  film: 'M4 3h16v18H4z M4 7h16 M4 17h16 M8 3v4 M16 3v4 M8 17v4 M16 17v4 M10 10l5 2-5 2z',
  plus: 'M12 5v14 M5 12h14',
  play: 'M8 5l11 7-11 7z',
  pause: 'M8 5v14 M16 5v14',
  back: 'M19 12H5 M11 6l-6 6 6 6',
  next: 'M5 12h14 M13 6l6 6-6 6',
  upload: 'M12 16V3 M7 8l5-5 5 5 M4 15v6h16v-6',
  download: 'M12 3v13 M7 11l5 5 5-5 M4 17v4h16v-4',
  scissors: 'M9 9l11 11 M9 15L20 4 M4 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6 M4 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
  trash: 'M3 6h18 M9 6V3h6v3 M6 6l1 15h10l1-15 M10 10v7 M14 10v7',
  copy: 'M8 8h12v13H8z M16 8V3H3v13h5',
  undo: 'M9 4L4 9l5 5 M4 9h10a6 6 0 0 1 0 12',
  redo: 'M15 4l5 5-5 5 M20 9H10a6 6 0 0 0 0 12',
  music: 'M9 17V5l11-2v12 M9 9l11-2 M6 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6 M17 13a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
  text: 'M4 4h16 M12 4v16 M8 20h8',
  image: 'M3 3h18v18H3z M3 17l6-6 4 4 3-3 5 5 M16 7h.01',
  folder: 'M3 7V4h6l3 3h9v13H3z',
  check: 'M5 12l4 4L19 6',
  close: 'M6 6l12 12 M6 18L18 6',
  rewind: 'M5 5v14 M19 5L8 12l11 7z',
  volume: 'M3 9h4l5-4v14l-5-4H3z M16 8a6 6 0 0 1 0 8 M19 5a10 10 0 0 1 0 14',
  settings: 'M4 6h16 M4 12h16 M4 18h16 M8 3v6 M16 9v6 M10 15v6',
  notes: 'M5 3h14v18H5z M9 7h6 M9 11h6 M9 15h4',
  fullscreen: 'M8 3H3v5 M16 3h5v5 M3 16v5h5 M21 16v5h-5',
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  help: 'M9 8a3 3 0 0 1 6 0c0 3-3 2-3 5 M12 17h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
} as const

export type LabIconName = keyof typeof paths
export default function LabIcon({ name, size = 18, style }: { name: LabIconName; size?: number; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, ...style }}><path d={paths[name]} /></svg>
}
