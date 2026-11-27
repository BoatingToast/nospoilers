import type { Metadata } from 'next'
import AdminDashboard from '@/components/audience/AdminDashboard'
export const metadata: Metadata = {
  title: 'Audience intelligence admin',
  robots: { index: false, follow: false },
}
export default async function AdminPage() {
  return <AdminDashboard />
}
