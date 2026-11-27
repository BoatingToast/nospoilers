import type { Metadata } from 'next'
import StudyResults from '@/components/audience/StudyResults'
export const metadata: Metadata = {
  title: 'Audience study results',
  robots: { index: false, follow: false },
}
export default async function StudyResultsPage({ params }: { params: Promise<{ id: string }> }) {
  return <StudyResults id={(await params).id} />
}
