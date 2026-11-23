'use client'

import { useEffect, useState } from 'react'

const ROW_REM = 2.75

/** Desktop table of contents with a marker that follows the section being read. */
export default function PolicyContents({ sections }: { sections: { id: string; title: string }[] }) {
  const [activeId, setActiveId] = useState(sections[0]?.id)

  useEffect(() => {
    const elements = sections
      .map(section => document.getElementById(section.id))
      .filter((element): element is HTMLElement => element !== null)

    let frame = 0
    const update = () => {
      frame = 0
      const line = window.innerHeight * 0.3
      let current = elements[0]
      for (const element of elements) {
        if (element.getBoundingClientRect().top <= line) current = element
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
        current = elements[elements.length - 1]
      }
      if (current) setActiveId(current.id)
    }
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [sections])

  const activeIndex = Math.max(0, sections.findIndex(section => section.id === activeId))

  return (
    <nav aria-label="On this page" className="hidden lg:sticky lg:top-28 lg:block lg:self-start">
      <p className="mb-3 pl-4 text-sm font-semibold text-ns-text">On this page</p>
      <div className="relative border-l border-ns-border">
        <span
          aria-hidden="true"
          className="absolute -left-px top-0 w-0.5 rounded-full bg-ns-secondary transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none"
          style={{ height: `${ROW_REM}rem`, transform: `translateY(${activeIndex * 100}%)` }}
        />
        {sections.map(section => {
          const active = section.id === activeId
          return (
            <a
              key={section.id}
              href={`#${section.id}`}
              aria-current={active ? 'location' : undefined}
              className={`flex h-11 items-center truncate pl-4 text-sm transition-colors duration-150 ${active ? 'font-semibold text-ns-text' : 'text-ns-muted hover:text-ns-text'}`}
            >
              <span className="truncate">{section.title}</span>
            </a>
          )
        })}
      </div>
    </nav>
  )
}
