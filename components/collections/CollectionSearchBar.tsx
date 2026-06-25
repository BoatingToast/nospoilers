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
            className="w-full bg-ns-surface border border-ns-border rounded-2xl pl-10 pr-14 py-3.5
                       text-ns-text font-body text-sm placeholder:text-ns-muted/50
                       focus:outline-none focus:border-ns-gold/40 transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setSuggestions([]); setShowDropdown(false); inputRef.current?.focus() }}
              className="absolute right-12 top-1/2 -translate-y-1/2 text-ns-muted hover:text-ns-text transition-colors"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          )}
          <button type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-ns-gold text-ns-bg
                       rounded-lg text-xs font-body font-medium hover:bg-ns-gold/90 transition-colors">
            Go
          </button>
        </div>
      </form>

      {/* Suggestions dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-ns-surface border border-ns-border rounded-2xl
                        shadow-2xl shadow-black/60 overflow-hidden z-50">
          {suggestions.map((s, i) => (
            <Link
              key={s.id}
              href={`/collections/${s.id}`}
              onClick={() => setShowDropdown(false)}
              className={`flex items-center gap-3 px-4 py-3 transition-colors
                ${i === activeIdx
                  ? 'bg-ns-gold/10 text-ns-gold'
                  : 'text-ns-muted hover:bg-ns-surface/80 hover:text-ns-text'
                } ${i > 0 ? 'border-t border-ns-border/50' : ''}`}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="3" y="3" width="7" height="18" rx="1"/>
                <rect x="13" y="3" width="8" height="11" rx="1"/>
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-ns-text text-sm font-body font-medium truncate">{s.title}</p>
                <p className="text-ns-muted/60 text-[11px] font-body">by @{s.username}</p>
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
