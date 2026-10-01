import type { Metadata } from 'next'
import TheaterRoom from '@/components/theater/TheaterRoom'

export const metadata: Metadata = { title: 'Step inside — NoSpoilers Theater' }
export default async function TheaterPreviewPage({ searchParams }: { searchParams: Promise<{ room?: string }> }) {
  const number = Number((await searchParams).room ?? 1)
  const roomNumber = Number.isInteger(number) && number >= 1 && number <= 8 ? number : 1
  return <TheaterRoom preview roomNumber={roomNumber} />
}
