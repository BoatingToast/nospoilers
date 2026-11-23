import type { Metadata } from 'next'
import StudyBuilder from '@/components/audience/StudyBuilder'
export const metadata: Metadata = {
  title: 'Create audience study — NoSpoilers',
  robots: { index: false, follow: false },
}
export default function NewStudyPage() {
  return <StudyBuilder />
}
