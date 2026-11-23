import type { Metadata } from 'next'
import StudyDiscovery from '@/components/audience/StudyDiscovery'
export const metadata: Metadata = {
  title: 'Audience studies — NoSpoilers',
  robots: { index: false, follow: false },
}
export default function AudienceStudiesPage() {
  return <StudyDiscovery />
}
