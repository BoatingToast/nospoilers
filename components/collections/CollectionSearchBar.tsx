'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRightIcon, CloseIcon, SearchIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import type { CollectionSuggestion } from '@/types'

interface Props {
  initialQuery?: string
  placeholder?:  string
  autoFocus?:    boolean
}

export default function CollectionSearchBar({
  initialQuery = '',
  placeholder  = 'Search collections, creators, movies…',
  autoFocus    = false,
}: Props) {
  const router = useRouter()
  const [query,       setQuery]       = useState(initialQuery)
  const [suggestions, setSuggestions] = useState<CollectionSuggestion[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [activeIdx,   setActiveIdx]   = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const timer    = useRef<ReturnType<typeof setTimeout>>()

  const fetchSuggestions = useCallback((q: string) => {
    clearTimeout(timer.current)
    if (!q.trim()) { setSuggestions([]); return }
    timer.current = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/collections/search?q=${encodeURIComponent(q)}&suggestions=true`)
        const data = await res.json()
        setSuggestions(data)
        setShowDropdown(true)
        setActiveIdx(-1)
      } catch { /* ignore */ }
    }, 200)
  }, [])

  useEffect(() => { fetchSuggestions(query) }, [query, fetchSuggestions])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setShowDropdown(false)
    router.push(`/collections/search?q=${encodeURIComponent(query.trim())}`)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown || suggestions.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)) }
    if (e.key === 'Escape')    { setShowDropdown(false); setActiveIdx(-1) }
    if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      const s = suggestions[activeIdx]
      setQuery(s.title)
      setShowDropdown(false)
      router.push(`/collections/${s.id}`)
    }
  }

  return (
    <div className="relative w-full">
      <form onSubmit={handleSubmit} role="search">
        <div className="relative">
          <SearchIcon size={18} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-ns-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            autoFocus={autoFocus}
            aria-label="Search collections"
            onChange={e => setQuery(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="min-h-14 w-full rounded-2xl bg-ns-surface py-3 pl-12 pr-[6.75rem] text-base text-ns-text transition-colors duration-150 placeholder:text-ns-subtle hover:bg-ns-surface-2 focus:bg-ns-surface-2"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => { setQuery(''); setSuggestions([]); setShowDropdown(false); inputRef.current?.focus() }}
              className="absolute right-[3.75rem] top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-ns-muted transition-colors duration-150 hover:text-ns-text"
            >
              <CloseIcon size={16} />
            </button>
          )}
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 min-h-11 -translate-y-1/2 rounded-full bg-ns-text px-4 text-sm font-semibold text-ns-bg transition-colors duration-150 hover:bg-ns-muted"
          >
            Go
          </button>
        </div>
      </form>

      {showDropdown && suggestions.length > 0 && (
        <div className="absolute inset-x-0 top-full z-40 mt-2 animate-fade-up overflow-hidden rounded-2xl bg-ns-surface-2 p-1.5 shadow-2xl">
          {suggestions.map((s, i) => (
            <Link
              key={s.id}
              href={`/collections/${s.id}`}
              onClick={() => setShowDropdown(false)}
              className={cn(
                'group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 transition-colors duration-150',
                i === activeIdx ? 'bg-ns-surface-3' : 'hover:bg-ns-surface-3',
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ns-text">{s.title}</p>
                <p className="truncate text-sm text-ns-muted">by @{s.username}</p>
              </div>
              <ArrowRightIcon size={16} className="flex-shrink-0 text-ns-muted transition-colors duration-150 group-hover:text-ns-text" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
