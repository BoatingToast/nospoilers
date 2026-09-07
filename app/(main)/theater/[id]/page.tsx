import type { Metadata } from 'next'
import TheaterRoom from '@/components/theater/TheaterRoom'

export const metadata: Metadata = { title: 'The premiere — NoSpoilers Theater', robots: { index: false } }
export default async function PremierePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ enter?: string }> }) {
  const { id } = await params
  return <TheaterRoom key={id} id={id} autoEnter={(await searchParams).enter === '1'} />
}
