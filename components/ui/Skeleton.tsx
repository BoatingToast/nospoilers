import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded bg-ns-surface', className)} />
  )
}

export function MovieCardSkeleton({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const widths  = { sm: 'w-[120px]', md: 'w-[185px]', lg: 'w-[280px]' }
  const heights = { sm: 'h-[180px]', md: 'h-[278px]', lg: 'h-[420px]' }
  return (
    <div className={`flex-shrink-0 ${widths[size]} ${heights[size]} rounded bg-ns-surface animate-pulse border border-ns-border`} />
  )
}

export function RecommendationCardSkeleton() {
  return (
    <div className="flex gap-4 border-t border-ns-border py-4 animate-pulse">
      <div className="w-[80px] h-[120px] rounded bg-ns-border flex-shrink-0" />
      <div className="flex-1 flex flex-col gap-3 pt-1">
        <div className="h-3 bg-ns-border rounded w-16" />
        <div className="h-4 bg-ns-border rounded w-3/4" />
        <div className="h-3 bg-ns-border rounded w-full" />
        <div className="h-3 bg-ns-border rounded w-2/3" />
      </div>
    </div>
  )
}
