'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-ns-muted"
            width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            autoFocus={autoFocus}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full rounded border border-ns-border bg-ns-surface py-3.5 pl-10 pr-24
                       font-body text-sm text-ns-text placeholder:text-ns-muted/50
                       focus:border-ns-text focus:outline-none transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setSuggestions([]); setShowDropdown(false); inputRef.current?.focus() }}
              className="absolute right-14 top-1/2 flex h-10 w-8 -translate-y-1/2 items-center justify-center text-ns-muted transition-colors hover:text-ns-text"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          )}
          <button type="submit"
            className="absolute right-1.5 top-1/2 h-10 -translate-y-1/2 rounded bg-ns-secondary px-3.5 font-heading text-sm
                       font-semibold text-ns-secondary-foreground transition-colors hover:bg-ns-text hover:text-ns-bg">
            Go
          </button>
        </div>
      </form>

      {/* Suggestions dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded border border-ns-border bg-ns-surface">
          {suggestions.map((s, i) => (
            <Link
              key={s.id}
              href={`/collections/${s.id}`}
              onClick={() => setShowDropdown(false)}
              className={`flex items-center gap-3 px-4 py-3 transition-colors
                ${i === activeIdx
                  ? 'bg-ns-secondary/10 text-ns-secondary-readable'
                  : 'text-ns-muted hover:bg-ns-surface/80 hover:text-ns-text'
                } ${i > 0 ? 'border-t border-ns-border' : ''}`}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="3" y="3" width="7" height="18" rx="1"/>
                <rect x="13" y="3" width="8" height="11" rx="1"/>
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-ns-text text-sm font-body font-medium truncate">{s.title}</p>
                <p className="text-ns-muted text-xs font-body">by @{s.username}</p>
              </div>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                className="flex-shrink-0 opacity-40">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
