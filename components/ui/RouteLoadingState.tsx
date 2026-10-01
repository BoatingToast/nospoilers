interface RouteLoadingStateProps {
  fullPage?: boolean
  label?: string
}

export default function RouteLoadingState({
  fullPage = false,
  label = 'Loading NoSpoilers',
}: RouteLoadingStateProps) {
  return (
    <div
      className={`px-4 py-10 sm:px-6 ${fullPage ? 'min-h-screen' : 'min-h-[65vh]'}`}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="mx-auto w-full min-w-0 max-w-6xl">
        <span className="sr-only">{label}</span>

        {/* Mirrors PageHeader: display title on the left, ruled column on the right */}
        <div className="grid gap-6 border-b border-ns-border pb-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-end lg:gap-10">
          <div className="h-16 w-3/4 max-w-md animate-pulse rounded bg-ns-border motion-reduce:animate-none sm:h-20" />
          <div className="space-y-3 border-t-2 border-ns-border pt-4">
            <div className="h-3 w-full animate-pulse rounded bg-ns-border motion-reduce:animate-none" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-ns-border/70 motion-reduce:animate-none" />
          </div>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-4 border-t-2 border-ns-border pt-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-3">
              <div className="aspect-[2/3] animate-pulse rounded bg-ns-border motion-reduce:animate-none" />
              <div className="h-3 w-4/5 animate-pulse rounded bg-ns-border motion-reduce:animate-none" />
              <div className="h-2.5 w-2/5 animate-pulse rounded bg-ns-border/70 motion-reduce:animate-none" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
