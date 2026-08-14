'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export default function SearchBar({ initialValue = '' }: { initialValue?: string }) {
  const [query, setQuery] = useState(initialValue)
  const [, startTransition] = useTransition()
  const router = useRouter()

  useEffect(() => setQuery(initialValue), [initialValue])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    startTransition(() => {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="relative mx-auto w-full min-w-0 max-w-xl">
      <div className="flex w-full min-w-0 items-center gap-0 rounded-2xl border border-ns-border bg-ns-surface
                      overflow-hidden focus-within:border-ns-secondary/40 focus-within:shadow-[0_0_20px_rgb(var(--ns-secondary)/0.1)]
                      transition-all duration-300">
        {/* Search icon */}
        <div className="flex-shrink-0 pl-4 text-ns-muted sm:pl-5">
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </div>

        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          aria-label="Search movies and people"
          placeholder="Search movies, actors, directors..."
          autoComplete="off"
          className="w-0 min-w-0 flex-1 bg-transparent px-3 py-4 text-ns-text placeholder:text-ns-muted/50 sm:px-4
                     focus:outline-none text-sm font-body"
        />

        <button
          type="submit"
          disabled={!query.trim()}
          className="m-1.5 flex-shrink-0 rounded-xl bg-ns-secondary px-3 py-2.5 text-sm font-semibold text-ns-bg sm:px-5 font-body
                     hover:bg-amber-400 transition-colors disabled:opacity-40
                     disabled:cursor-not-allowed"
        >
          Search
        </button>
      </div>
    </form>
  )
}
