import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-ns-bg">
      <Navbar />
      {/* pt-16 matches the fixed navbar height (h-16) */}
      <main className="flex-1 pt-16">{children}</main>
      <Footer />
    </div>
  )
}
