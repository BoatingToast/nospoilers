import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-lg bg-ns-surface', className)} />
  )
}

export function MovieCardSkeleton({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const widths = { sm: 'w-[120px]', md: 'w-[185px]', lg: 'w-[280px]' }
  return (
    <div className={`flex-shrink-0 ${widths[size]}`}>
      <div className="aspect-[2/3] animate-pulse rounded-xl bg-ns-surface" />
      <div className="mt-2.5 h-4 w-4/5 animate-pulse rounded-sm bg-ns-surface" />
      <div className="mt-1.5 h-3 w-2/5 animate-pulse rounded-sm bg-ns-surface" />
    </div>
  )
}

export function RecommendationCardSkeleton() {
  return (
    <div className="flex animate-pulse gap-4 rounded-2xl bg-ns-surface p-4">
      <div className="h-[120px] w-[80px] flex-shrink-0 rounded-lg bg-ns-surface-2" />
      <div className="flex flex-1 flex-col gap-3 pt-1">
        <div className="h-3 w-16 rounded-sm bg-ns-surface-2" />
        <div className="h-4 w-3/4 rounded-sm bg-ns-surface-2" />
        <div className="h-3 w-full rounded-sm bg-ns-surface-2" />
        <div className="h-3 w-2/3 rounded-sm bg-ns-surface-2" />
      </div>
    </div>
  )
}
