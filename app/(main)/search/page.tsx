import SearchBar from '@/components/landing/SearchBar'
import SearchResultsClient from '@/components/search/SearchResultsClient'
import type { Metadata } from 'next'

interface Props {
  searchParams: Promise<{ q?: string }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams
  const query = q?.trim()
  return { title: query ? `"${query}" — NoSpoilers Search` : 'Search — NoSpoilers' }
}

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams
  const query = q?.trim() ?? ''

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <header className="mb-8 text-center">
        <p className="mb-2 text-xs font-body uppercase tracking-[0.22em] text-ns-secondary">Explore NoSpoilers</p>
        <h1 className="font-display text-4xl tracking-wider text-ns-text sm:text-5xl">SEARCH</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm font-body text-ns-muted">
          Find movies, actors, and directors without revealing the plot.
        </p>
      </header>

      <div className="mb-10">
        <SearchBar initialValue={query} />
      </div>
      <SearchResultsClient query={query} />
    </div>
  )
}
