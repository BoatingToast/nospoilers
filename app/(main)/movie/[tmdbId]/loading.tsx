import { Skeleton } from '@/components/ui/Skeleton'

export default function MovieLoading() {
  return (
    <div role="status" aria-label="Loading movie" className="mx-auto max-w-7xl px-4 pb-16 pt-4 sm:px-6 sm:pt-6">
      <Skeleton className="mb-4 mt-3 h-5 w-64 max-w-full sm:mb-6" />
      <div className="grid gap-8 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-end lg:gap-14">
        <Skeleton className="mx-auto aspect-[2/3] w-56 rounded-xl sm:w-64 lg:mx-0 lg:w-full" />
        <div>
          <Skeleton className="h-7 w-40 rounded-full" />
          <Skeleton className="mt-4 h-16 w-full max-w-2xl" />
          <Skeleton className="mt-5 h-5 w-72 max-w-full" />
          <Skeleton className="mt-4 h-5 w-full max-w-xl" />
          <div className="mt-6 flex flex-wrap gap-2.5">
            <Skeleton className="h-11 w-40 rounded-full" />
            <Skeleton className="h-11 w-32 rounded-full" />
          </div>
        </div>
      </div>
      <Skeleton className="mt-10 h-96 rounded-3xl lg:mt-14" />
    </div>
  )
}
