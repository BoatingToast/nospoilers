import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Navbar from '@/components/landing/Navbar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen bg-ns-bg">
      <Navbar />
      {/* pt-16 matches the fixed navbar height (h-16) */}
      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          {children}
        </div>
      </main>
    </div>
  )
}
