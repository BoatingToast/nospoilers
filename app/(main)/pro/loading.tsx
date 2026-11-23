import { Skeleton } from '@/components/ui/Skeleton'

export default function ProLoading() {
  return (
    <div className="mx-auto min-h-[65vh] max-w-7xl px-4 pb-16 pt-10 sm:px-6 sm:pt-14" aria-busy="true" aria-live="polite">
      <span className="sr-only">Opening Pro</span>
      <Skeleton className="h-16 w-64 max-w-full rounded-xl sm:h-24 sm:w-[28rem]" />
      <Skeleton className="mt-5 h-6 w-full max-w-md" />
      <div className="mt-8 grid gap-6 sm:mt-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
        <Skeleton className="h-[440px] rounded-3xl lg:order-2 lg:h-[570px]" />
        <div className="space-y-3 lg:order-1">
          {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-[72px] rounded-2xl" />)}
        </div>
      </div>
    </div>
  )
}
