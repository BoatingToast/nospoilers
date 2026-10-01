'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

interface DiscoverScrollSceneProps {
  children: ReactNode
  sectionCount: number
}

function sectionNumber(value: number) {
  return String(value).padStart(2, '0')
}

export default function DiscoverScrollScene({
  children,
  sectionCount,
}: DiscoverScrollSceneProps) {
  const sceneRef = useRef<HTMLDivElement>(null)
  const [activeSection, setActiveSection] = useState(1)

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return

    const sections = Array.from(
      scene.querySelectorAll<HTMLElement>('[data-discover-section]'),
    )
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reducedMotion) {
      sections.forEach(section => {
        section.dataset.visible = 'true'
      })
      scene.style.setProperty('--discover-progress', '1')
      return
    }

    // Keep the server-rendered page visible until this setup is complete.
    // Anything already in the viewport stays visible when motion is enabled.
    sections.forEach(section => {
      const rect = section.getBoundingClientRect()
      section.dataset.visible = rect.top < window.innerHeight * 0.92 && rect.bottom > 0
        ? 'true'
        : 'false'
    })
    scene.dataset.motionReady = 'true'

    const revealObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            ;(entry.target as HTMLElement).dataset.visible = 'true'
          }
        })
      },
      {
        rootMargin: '0px 0px -12% 0px',
        threshold: [0.08, 0.2, 0.45],
      },
    )

    sections.forEach(section => revealObserver.observe(section))

    let frame = 0
    const updateScrollScene = () => {
      frame = 0

      const sceneRect = scene.getBoundingClientRect()
      const scrollableDistance = Math.max(scene.offsetHeight - window.innerHeight, 1)
      const progress = Math.min(1, Math.max(0, -sceneRect.top / scrollableDistance))
      scene.style.setProperty('--discover-progress', progress.toFixed(4))

      const focalPoint = window.innerHeight * 0.36
      const nearestSection = sections
        .filter(section => {
          const rect = section.getBoundingClientRect()
          return rect.bottom > 80 && rect.top < window.innerHeight * 0.9
        })
        .sort((a, b) => (
          Math.abs(a.getBoundingClientRect().top - focalPoint)
          - Math.abs(b.getBoundingClientRect().top - focalPoint)
        ))[0]

      if (nearestSection) {
        const nextSection = Number(nearestSection.dataset.sectionIndex ?? 1)
        setActiveSection(current => current === nextSection ? current : nextSection)
      }
    }

    const requestScrollUpdate = () => {
      if (frame) return
      frame = window.requestAnimationFrame(updateScrollScene)
    }

    updateScrollScene()
    window.addEventListener('scroll', requestScrollUpdate, { passive: true })
    window.addEventListener('resize', requestScrollUpdate)

    return () => {
      revealObserver.disconnect()
      window.removeEventListener('scroll', requestScrollUpdate)
      window.removeEventListener('resize', requestScrollUpdate)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div ref={sceneRef} className="discover-scene relative min-h-screen overflow-clip pb-28">
      <div className="pointer-events-none fixed inset-x-0 bottom-0 top-16 z-0 overflow-hidden" aria-hidden="true">
        <div className="discover-grid absolute inset-0" />
        <div className="discover-aurora discover-aurora-one absolute" />
        <div className="discover-aurora discover-aurora-two absolute" />
        <div className="discover-scanline absolute inset-x-0 top-0 h-px" />
      </div>

      {sectionCount > 0 && (
        <div
          className="pointer-events-none fixed right-6 top-1/2 z-30 hidden -translate-y-1/2 items-center gap-4 xl:flex"
          aria-hidden="true"
        >
          <div className="flex flex-col items-end">
            <span className="font-body text-[9px] uppercase tracking-[0.24em] text-ns-muted/55">
              Signal depth
            </span>
            <span className="mt-1 font-display text-2xl tracking-widest text-ns-text">
              {sectionNumber(activeSection)}
              <span className="text-ns-muted/35"> / {sectionNumber(sectionCount)}</span>
            </span>
          </div>
          <div className="relative h-40 w-px overflow-hidden bg-ns-border/70">
            <span
              className="absolute inset-0 origin-top bg-gradient-to-b from-ns-secondary via-ns-secondary to-transparent shadow-[0_0_14px_rgb(var(--ns-secondary)/0.65)]"
              style={{ transform: 'scaleY(var(--discover-progress))' }}
            />
          </div>
        </div>
      )}

      <div className="relative z-10">{children}</div>
    </div>
  )
}
