import type { Metadata } from 'next'
import StudyParticipant from '@/components/audience/StudyParticipant'
export const metadata: Metadata = {
  title: 'Audience study — NoSpoilers',
  robots: { index: false, follow: false },
}
export default async function StudyPage({ params }: { params: Promise<{ code: string }> }) {
  return (
    <div className="px-4 py-12 sm:px-6">
      <StudyParticipant code={(await params).code} />
    </div>
  )
}
