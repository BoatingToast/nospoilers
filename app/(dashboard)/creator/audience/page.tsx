import type { Metadata } from 'next'
import CreatorEngine from '@/components/audience/CreatorEngine'
export const metadata: Metadata = {
  title: 'Audience Engine',
  robots: { index: false, follow: false },
}
export default function AudienceEnginePage() {
  return <CreatorEngine />
}
