import { MovieCardSkeleton, Skeleton } from '@/components/ui/Skeleton'

export default function DiscoverLoading() {
  return (
    <div role="status" aria-label="Loading movies" className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <Skeleton className="h-12 w-72 max-w-full" />
      <Skeleton className="mt-4 h-5 w-full max-w-xl" />
      <div className="mt-8 grid gap-7 rounded-3xl bg-ns-surface p-6 sm:p-10 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-16 lg:p-14">
        <Skeleton className="mx-auto aspect-[2/3] w-52 rounded-xl !bg-ns-surface-2 sm:w-60 lg:order-2 lg:w-[21rem]" />
        <div className="lg:order-1">
          <Skeleton className="h-5 w-40 !bg-ns-surface-2" />
          <Skeleton className="mt-4 h-16 w-full max-w-lg !bg-ns-surface-2" />
          <Skeleton className="mt-5 h-5 w-32 !bg-ns-surface-2" />
          <Skeleton className="mt-7 h-14 w-full rounded-full !bg-ns-surface-2 sm:w-40" />
        </div>
      </div>
      <Skeleton className="mt-12 h-9 w-56" />
      <div className="mt-5 flex gap-5 overflow-hidden">
        {Array.from({ length: 7 }).map((_, index) => <MovieCardSkeleton key={index} />)}
      </div>
    </div>
  )
}
