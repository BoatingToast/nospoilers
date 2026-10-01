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
      className={`flex items-center justify-center px-4 py-16 ${fullPage ? 'min-h-screen' : 'min-h-[65vh]'}`}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="w-full max-w-4xl">
        <span className="sr-only">{label}</span>

        <div className="mb-8 flex items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="h-3 w-28 animate-pulse rounded-full bg-ns-secondary/30 motion-reduce:animate-none" />
            <div className="h-9 w-64 max-w-[70vw] animate-pulse rounded-lg bg-ns-border motion-reduce:animate-none" />
          </div>
          <div className="h-10 w-10 animate-pulse rounded-full border border-ns-border bg-ns-surface motion-reduce:animate-none" />
        </div>

        <div className="rounded-3xl border border-ns-border bg-ns-surface p-5 sm:p-7">
          <div className="mb-6 h-40 animate-pulse rounded-2xl bg-ns-surface-2 motion-reduce:animate-none" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-3">
                <div className="aspect-[2/3] animate-pulse rounded-xl bg-ns-border motion-reduce:animate-none" />
                <div className="h-3 w-4/5 animate-pulse rounded-full bg-ns-border motion-reduce:animate-none" />
                <div className="h-2.5 w-2/5 animate-pulse rounded-full bg-ns-border/70 motion-reduce:animate-none" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
