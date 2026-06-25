import Navbar from '@/components/landing/Navbar'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ns-bg">
      <Navbar />
      {/* pt-16 matches the fixed navbar height (h-16) */}
      <main className="pt-16">{children}</main>
    </div>
  )
}
