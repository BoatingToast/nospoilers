'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRightIcon } from '@/components/icons'

export default function SearchBar({ initialValue = '' }: { initialValue?: string }) {
  const [query, setQuery] = useState(initialValue)
  const [, startTransition] = useTransition()
  const router = useRouter()

  useEffect(() => setQuery(initialValue), [initialValue])

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!query.trim()) return
    startTransition(() => {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="w-full min-w-0 max-w-xl">
      <div className="flex h-14 w-full min-w-0 items-center rounded-full bg-ns-surface pl-5 pr-1.5 ring-1 ring-ns-border transition-shadow focus-within:ring-2 focus-within:ring-ns-text">
        <input
          type="text"
          value={query}
          onChange={event => setQuery(event.target.value)}
          aria-label="Search movies and people"
          placeholder="Search any movie or actor"
          autoComplete="off"
          className="h-full w-0 min-w-0 flex-1 bg-transparent font-body text-base text-ns-text placeholder:text-ns-subtle focus:outline-none"
        />

        <button
          type="submit"
          aria-label="Search"
          disabled={!query.trim()}
          className="ml-2 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-ns-secondary text-ns-secondary-foreground transition-colors hover:bg-ns-secondary-readable disabled:cursor-not-allowed disabled:bg-ns-surface-3 disabled:text-ns-muted"
        >
          <ArrowRightIcon size={18} />
        </button>
      </div>
    </form>
  )
}
