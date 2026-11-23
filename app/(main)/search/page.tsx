import SearchBar from '@/components/landing/SearchBar'
import SearchResultsClient from '@/components/search/SearchResultsClient'
import PageHeader from '@/components/ui/PageHeader'
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
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12 lg:pb-24">
      <PageHeader
        title="Search"
        description="Find movies, actors, and directors without revealing the plot."
      />

      <div className="mb-10 mt-6 lg:mb-12">
        <SearchBar initialValue={query} />
      </div>
      <SearchResultsClient query={query} />
    </div>
  )
}
