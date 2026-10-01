import SearchBar from '@/components/landing/SearchBar'
import PageHeader from '@/components/ui/PageHeader'
import SearchResultsClient from '@/components/search/SearchResultsClient'
import type { Metadata } from 'next'

interface Props {
  searchParams: Promise<{ q?: string }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams
  const query = q?.trim()
  return {
    title: query ? `"${query}" — Movie Search` : 'Search Movies & People',
    robots: { index: false, follow: true },
  }
}

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams
  const query = q?.trim() ?? ''

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader title="SEARCH" lede="Find movies, actors, and directors without revealing the plot.">
        <SearchBar initialValue={query} />
      </PageHeader>

      <div className="mt-10">
        <SearchResultsClient query={query} />
      </div>
    </div>
  )
}
