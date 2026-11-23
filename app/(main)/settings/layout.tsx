import SettingsNav from '@/components/settings/SettingsNav'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6 lg:pt-16">
      <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-14">
        <SettingsNav />
        <div className="mt-8 min-w-0 lg:mt-0">{children}</div>
      </div>
    </div>
  )
}
