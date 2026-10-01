import type { Metadata } from 'next'
import AudienceLabReport from '@/components/creator/AudienceLabReport'

export const metadata: Metadata = { title: 'Audience Lab report — NoSpoilers' }

export default async function AudienceLabReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <AudienceLabReport id={id} />
}
