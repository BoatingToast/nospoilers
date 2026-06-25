'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export default function SearchBar({ initialValue = '' }: { initialValue?: string }) {
  const [query, setQuery] = useState(initialValue)
  const [, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    startTransition(() => {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="relative max-w-xl mx-auto w-full">
      <div className="flex items-center gap-0 bg-ns-surface border border-ns-border rounded-2xl
                      overflow-hidden focus-within:border-ns-gold/40 focus-within:shadow-[0_0_20px_rgba(200,150,62,0.1)]
                      transition-all duration-300">
        {/* Search icon */}
        <div className="pl-5 text-ns-muted flex-shrink-0">
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </div>

        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search for a movie..."
          className="flex-1 px-4 py-4 bg-transparent text-ns-text placeholder:text-ns-muted/50
                     focus:outline-none text-sm font-body"
        />

        <button
          type="submit"
          disabled={!query.trim()}
          className="m-1.5 px-5 py-2.5 bg-ns-gold text-ns-bg text-sm font-semibold font-body
                     rounded-xl hover:bg-amber-400 transition-colors disabled:opacity-40
                     disabled:cursor-not-allowed flex-shrink-0"
        >
          Search
        </button>
      </div>
    </form>
  )
}
