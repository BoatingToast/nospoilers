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
      className={`mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 ${fullPage ? 'min-h-dvh' : 'min-h-[65vh]'}`}
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">{label}</span>
      <div className="h-12 w-72 max-w-[70vw] animate-pulse rounded-lg bg-ns-surface" />
      <div className="mt-4 h-5 w-96 max-w-full animate-pulse rounded-sm bg-ns-surface" />
      <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index}>
            <div className="aspect-[2/3] animate-pulse rounded-xl bg-ns-surface" />
            <div className="mt-2.5 h-4 w-4/5 animate-pulse rounded-sm bg-ns-surface" />
            <div className="mt-1.5 h-3 w-2/5 animate-pulse rounded-sm bg-ns-surface" />
          </div>
        ))}
      </div>
    </div>
  )
}
