import type { Metadata } from 'next'
import StudyResults from '@/components/audience/StudyResults'
export const metadata: Metadata = {
  title: 'Admin study report',
  robots: { index: false, follow: false },
}
export default async function AdminStudyPage({ params }: { params: Promise<{ id: string }> }) {
  return <StudyResults id={(await params).id} admin />
}
